/**
 * Sprint 41 Phase F8 — vitest coverage for the reorganised + collapsible
 * Layout sidebar (F1 + F5 + F6).
 *
 * Covers:
 *   1. Reorganised navigation renders Dashboard plus the four named groups
 *      (EVENTS & ALERTS, ASSETS, INVENTORY, EDGE & CONNECTIONS) when
 *      expanded, with every operator-day route present.
 *   2. Group headers disappear and items collapse to a flat icon list when
 *      the Sider is collapsed (so the empty-header reserve-row doesn't
 *      leak visual noise into icon-only mode).
 *   3. Collapsed state persists under the per-(tenantId, userId)
 *      localStorage key and re-hydrates on next mount with the same auth
 *      context.
 *
 * All hooks the Layout depends on are mocked at the module level so the
 * test is decoupled from network + global app providers — the contract
 * we care about is purely UI structure + persistence.
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

describe('Layout — Sprint 41 sidebar reorganisation (F1 + F5)', () => {
  it('renders Dashboard plus the four named groups with all operator routes', () => {
    renderLayout();

    const sider = screen.getByTestId('sider');
    expect(sider).toHaveAttribute('data-collapsed', 'false');

    // Dashboard is solo (no group header) above the first group.
    expect(within(sider).getByText('Dashboard')).toBeInTheDocument();

    // The four named groups (F5 mandates these exact labels).
    expect(within(sider).getByText('EVENTS & ALERTS')).toBeInTheDocument();
    expect(within(sider).getByText('ASSETS')).toBeInTheDocument();
    expect(within(sider).getByText('INVENTORY')).toBeInTheDocument();
    expect(within(sider).getByText('EDGE & CONNECTIONS')).toBeInTheDocument();

    // Every operator-day route under those groups.
    for (const label of [
      // EVENTS & ALERTS
      'Telemetry',
      'Telemetry Models',
      'Rules',
      'Alerts',
      // ASSETS
      'Assets',
      'Categories',
      'Locations',
      'Map',
      // INVENTORY
      'Products',
      'Lot Expiry',
      'Stock Levels',
      'Stock Movements',
      'CSV Import',
      // EDGE & CONNECTIONS
      'Devices',
      'Integrations',
    ]) {
      expect(within(sider).getByText(label)).toBeInTheDocument();
    }
  });
});

describe('Layout — Sprint 41 collapsible sidebar (F6)', () => {
  it('drops group headers when collapsed (flat icon-only menu)', () => {
    renderLayout();
    const sider = screen.getByTestId('sider');

    // AntD's Sider exposes a trigger button at the bottom. Toggling it
    // calls our onCollapse handler which persists + flips data-collapsed.
    const trigger = sider.querySelector('.ant-layout-sider-trigger') as HTMLElement;
    expect(trigger).toBeTruthy();
    fireEvent.click(trigger);

    expect(sider).toHaveAttribute('data-collapsed', 'true');

    // Group headers are no longer rendered in the DOM — the collapsed
    // menuItems branch drops `type: 'group'` wrappers entirely.
    expect(within(sider).queryByText('EVENTS & ALERTS')).not.toBeInTheDocument();
    expect(within(sider).queryByText('ASSETS')).not.toBeInTheDocument();
    expect(within(sider).queryByText('INVENTORY')).not.toBeInTheDocument();
    expect(within(sider).queryByText('EDGE & CONNECTIONS')).not.toBeInTheDocument();

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
