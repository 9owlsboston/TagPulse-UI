/**
 * Sprint 54 Phase B (54.2) — vitest coverage for the sectioned sider
 * + retained Sprint 41 Phase F6 collapsed-state persistence.
 *
 * Covers:
 *   1. Sider renders the two ungrouped top items (Dashboard, Alerts)
 *      plus the four collapsible SubMenu sections (Asset Tracking,
 *      Inventory, Data Management, Devices & Telemetry) with their
 *      operator-day routes reachable.
 *   2. Collapsed state persists under the per-(tenantId, userId)
 *      localStorage key and re-hydrates on next mount.
 *
 * All hooks the Layout depends on are mocked at the module level so
 * the test stays decoupled from network + global providers.
 */
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/Layout';

// ─── Module mocks ───────────────────────────────────────────────────────────

const mockAuth = {
  tenantId: 'test-tenant',
  user: {
    id: 'user-1',
    email: 'op@example.com',
    name: 'Op User',
    role: 'admin' as const,
    tenant_id: 'test-tenant',
    tenant_name: 'Test Tenant',
  },
  role: 'admin' as const,
  isAuthenticated: true,
  accessToken: 'tok',
  loginWithApiKey: vi.fn(),
  loginWithTenantId: vi.fn(),
  logout: vi.fn(),
};

vi.mock('@/lib/auth', () => ({
  useAuth: () => mockAuth,
}));

vi.mock('@/hooks/useTenantConfig', () => ({
  useTenantConfig: () => ({
    data: { name: 'Test Tenant', tracking_modes: ['asset', 'inventory'] },
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useTenantBranding', () => ({
  useTenantBranding: () => ({ data: { display_name: 'Test Tenant' }, isLoading: false }),
}));

vi.mock('@/components/ApiHealthGate', () => ({
  useVersionInfo: () => ({ uiVersion: '0.0.0-test', apiVersion: 'test' }),
  useHealthStatus: () => ({ degraded: false, degradedReason: null, degradedDetail: null }),
}));

vi.mock('@/theme/ThemeProvider', () => ({
  useThemeMode: () => ({ mode: 'light' as const, setMode: vi.fn() }),
}));

vi.mock('@/components/BrandSync', () => ({
  BrandSync: () => null,
}));

vi.mock('@/components/AccountDropdown', () => ({
  AccountDropdown: () => <div data-testid="account-dropdown" />,
}));

// ─── Helpers ───────────────────────────────────────────────────────────────

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<div data-testid="outlet">Home</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  // Each test starts with a clean localStorage so prior persistence
  // doesn't bleed in — F6 reads the collapsed flag on mount.
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('Layout — entity-first sectioned sider (Sprint 61)', () => {
  it('renders the Dashboard top item plus the entity section headers', () => {
    renderLayout();

    const sider = screen.getByTestId('sider');
    expect(sider).toHaveAttribute('data-collapsed', 'false');

    // Dashboard is the only ungrouped top item by default.
    expect(within(sider).getByText('Dashboard')).toBeInTheDocument();

    // Entity-first section headers (Sprint 61 IA). Under the default label map
    // the device section renders "Devices"; `sec-locations` is empty so it is
    // dropped by Layout and does not render a header.
    expect(within(sider).getByText('Assets')).toBeInTheDocument();
    expect(within(sider).getByText('Tags')).toBeInTheDocument();
    expect(within(sider).getByText('Devices')).toBeInTheDocument();
    expect(within(sider).getByText('Inventory')).toBeInTheDocument();
    expect(within(sider).getByText('Alerts')).toBeInTheDocument();
    expect(within(sider).getByText('Data Management')).toBeInTheDocument();
    expect(within(sider).queryByText('Locations')).not.toBeInTheDocument();

    // Sections start collapsed (initial route `/` is ungrouped). Per-item
    // surface coverage is provided by the route-reachability smoke test
    // in `src/lib/nav.test.ts` — opening every SubMenu here would just
    // re-verify what that test already checks against the registry.
  });

  it('opens a section on click and reveals its child items', () => {
    renderLayout();
    const sider = screen.getByTestId('sider');

    fireEvent.click(within(sider).getByText('Tags'));
    expect(within(sider).getByText('Tag Reads')).toBeInTheDocument();
    expect(within(sider).getByText('Tag Transfers')).toBeInTheDocument();
    expect(within(sider).getByText('Tag Reconciliation')).toBeInTheDocument();
    expect(within(sider).getByText('Tag Import')).toBeInTheDocument();
  });
});

describe('Layout — Sprint 41 collapsible sidebar (F6)', () => {
  it('collapses brand text + version footer when the sider is collapsed', () => {
    renderLayout();
    const sider = screen.getByTestId('sider');

    const trigger = sider.querySelector('.ant-layout-sider-trigger') as HTMLElement;
    expect(trigger).toBeTruthy();
    fireEvent.click(trigger);

    expect(sider).toHaveAttribute('data-collapsed', 'true');

    // Brand display name is hidden in collapsed mode (logo space stays).
    const brandHeader = screen.getByTestId('sider-brand-header');
    expect(within(brandHeader).queryByText('Test Tenant')).not.toBeInTheDocument();

    // Version footer is suppressed in collapsed mode too.
    expect(screen.queryByTestId('version-footer')).not.toBeInTheDocument();
  });

  it('persists collapsed state under the per-(tenant, user) localStorage key', () => {
    const expectedKey = `tagpulse.sidebar.collapsed:${mockAuth.tenantId}:${mockAuth.user.id}`;

    // Pre-condition: no persisted state.
    expect(window.localStorage.getItem(expectedKey)).toBeNull();

    const { unmount } = renderLayout();
    const sider = screen.getByTestId('sider');
    expect(sider).toHaveAttribute('data-collapsed', 'false');

    // Collapse via Sider trigger; write-through to localStorage.
    fireEvent.click(sider.querySelector('.ant-layout-sider-trigger') as HTMLElement);
    expect(sider).toHaveAttribute('data-collapsed', 'true');
    expect(window.localStorage.getItem(expectedKey)).toBe('1');

    unmount();
    cleanup();
  });

  it('re-hydrates from localStorage on a fresh mount', () => {
    const expectedKey = `tagpulse.sidebar.collapsed:${mockAuth.tenantId}:${mockAuth.user.id}`;
    // Seed localStorage as if a previous session collapsed the sidebar.
    window.localStorage.setItem(expectedKey, '1');

    renderLayout();
    // useState's lazy initializer reads localStorage → collapsed:true at
    // first paint. The Sider's responsive `onCollapse` event (fired on
    // mount under jsdom's no-match matchMedia stub) is intentionally
    // NOT persisted by `handleSiderCollapse`, so the seeded value
    // survives mount.
    expect(screen.getByTestId('sider')).toHaveAttribute('data-collapsed', 'true');
    // Sanity: localStorage value is preserved, not overwritten.
    expect(window.localStorage.getItem(expectedKey)).toBe('1');
  });
});
