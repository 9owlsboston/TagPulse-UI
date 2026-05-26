/**
 * Sprint 36 / #25 — App integration test.
 *
 * Mounts <AppRoutes /> (the lazy + Suspense + Routes tree extracted from
 * <App /> in App.tsx) inside a <MemoryRouter> so we can exercise every
 * route's lazy declaration end-to-end. Catches regressions that the 87
 * per-page unit tests cannot:
 *
 *   1. A `lazy(() => import('@/pages/...'))` path typo that resolves to
 *      `undefined` — React throws "Element type is invalid".
 *   2. A page changing from named-export → default-export (or vice versa)
 *      such that the `.then(m => ({ default: m.X }))` wrapper now picks
 *      the wrong key, so `default` is `undefined`.
 *   3. The <Suspense> boundary being accidentally moved or stripped — the
 *      thrown promise from lazy would crash the render with no fallback.
 *
 * The providers required by the inner tree (auth, layout, route-tracker)
 * are mocked as pass-throughs so the test focuses on the lazy / Suspense
 * lifecycle and does not require a running API. Each page's own data
 * hooks may still kick off `fetch` — we stub a default 200 empty
 * response so they don't hang or crash the render.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AntApp from 'antd/es/app';
import { ThemeProvider } from '@/theme/ThemeProvider';

// AuthProvider: pass-through; useAuth: pretend an admin is logged in so
// TenantGuard renders its children instead of the login form.
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');
  return {
    ...actual,
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useAuth: () => ({
      tenantId: 'test-tenant',
      user: {
        id: 'u1',
        email: 'admin@example.com',
        name: 'Test Admin',
        role: 'admin' as const,
        tenant_id: 'test-tenant',
        tenant_name: 'Test Co',
      },
      role: 'admin' as const,
      accessToken: 'fake-jwt',
      isAuthenticated: true,
      loginWithApiKey: vi.fn(),
      loginWithTenantId: vi.fn(),
      logout: vi.fn(),
    }),
  };
});

// Layout: real one drags in <Sider>, useTenantBranding, AccountDropdown,
// etc. — none of which matter for the lazy/Suspense smoke. Replace with
// a bare <Outlet />.
vi.mock('@/components/Layout', () => ({
  Layout: () => <Outlet />,
}));

// RouteTracker: App Insights side-effect only; no-op for tests.
vi.mock('@/components/RouteTracker', () => ({
  RouteTracker: () => null,
}));

// Default fetch stub so page hooks (TanStack Query, plain fetch) do not
// hang or surface 404s during the test. Returns `[]` for collections and
// `{}` for object endpoints; both are JSON-parseable so the generated
// API client's `await response.json()` succeeds.
beforeEach(() => {
  globalThis.fetch = vi.fn(async () => {
    return new Response('[]', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as unknown as typeof fetch;

  // Dashboard / TagReads subscribe to `/integrations/stream` via
  // EventSource for live row-flash. jsdom does not implement
  // EventSource, so installing a no-op stub keeps the useEffect from
  // throwing a ReferenceError mid-mount.
  class EventSourceStub {
    onmessage: ((ev: unknown) => unknown) | null = null;
    onerror: ((ev: unknown) => unknown) | null = null;
    addEventListener() {}
    removeEventListener() {}
    close() {}
  }
  (globalThis as { EventSource?: unknown }).EventSource = EventSourceStub;
});

// AppRoutes is imported AFTER vi.mock declarations above. vi.mock is
// hoisted to the top of the module by Vitest's transformer, so by the
// time App.tsx evaluates the mocked dependencies (auth, Layout,
// RouteTracker) are already in place.
import { AppRoutes } from './App';

// ── Helpers ────────────────────────────────────────────────────────────────
function renderRoute(route: string) {
  // Fresh QueryClient per render so cached data doesn't bleed between
  // routes. Retries off so failed queries don't keep the test alive.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AntApp>
          <MemoryRouter initialEntries={[route]}>
            <AppRoutes />
          </MemoryRouter>
        </AntApp>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

// ── Routes under test ─────────────────────────────────────────────────────
// A representative sample touching: dashboard, devices, rules,
// categories, branding admin, inventory. If any of these lazy imports
// breaks, the corresponding case fails.
const SMOKE_ROUTES: ReadonlyArray<readonly [string, string]> = [
  ['/', 'Dashboard'],
  ['/devices', 'DeviceList'],
  ['/rules', 'RuleList'],
  ['/categories', 'CategoryList'],
  ['/admin/branding', 'Branding'],
  ['/inventory/lots', 'LotExpiryQueue'],
] as const;

describe('App lazy + Suspense boundary', () => {
  it('renders the Suspense fallback synchronously on first mount', () => {
    renderRoute('/devices');
    // The data-testid is set on the centred AntD <Spin> wrapper in
    // src/App.tsx. It must be present on the first synchronous render
    // (before the lazy import resolves) or Suspense is broken.
    expect(screen.getByTestId('app-suspense-fallback')).toBeInTheDocument();
  });

  it.each(SMOKE_ROUTES)(
    'mounts route %s (lazy → %s) without throwing',
    async (route) => {
      // If a lazy import resolves to `undefined`, React throws
      // synchronously here ("Element type is invalid"). If the Suspense
      // boundary is missing, the thrown promise crashes the render with
      // "A component suspended while rendering, but no fallback UI was
      // specified". Either failure surfaces as a render error and fails
      // the test.
      const { container } = renderRoute(route);

      // Wait for the Suspense fallback to clear — proves the lazy chunk
      // resolved and the page component mounted. We don't assert page
      // copy because that would couple the smoke test to per-page
      // markup that drifts over time.
      await waitFor(
        () => {
          expect(
            container.querySelector('[data-testid="app-suspense-fallback"]'),
          ).toBeNull();
        },
        { timeout: 5000 },
      );

      // Sanity check: the route mounted some DOM beyond the now-cleared
      // fallback. An empty container would indicate the lazy chunk
      // resolved to a component that rendered nothing (unlikely for
      // real pages, but cheap insurance).
      expect(container.firstChild).toBeTruthy();
    },
  );
});
