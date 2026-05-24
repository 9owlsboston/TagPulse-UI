import { Suspense } from 'react';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AntApp from 'antd/es/app';
import Spin from 'antd/es/spin';
import { AuthProvider } from '@/lib/auth';
import { TenantGuard } from '@/components/TenantGuard';
import { Layout } from '@/components/Layout';
import { ApiHealthGate } from '@/components/ApiHealthGate';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteTracker } from '@/components/RouteTracker';
import { handleGlobal401 } from '@/lib/auth';
import { ThemeProvider } from '@/theme/ThemeProvider';
// Sprint 38 / SWA stale-chunk fix: `lazyWithReload` triggers a hard reload
// when a dynamically imported module fails (browser holds a stale
// `index.html` that points at chunk hashes the new build no longer ships).
// See `src/lib/lazyWithReload.ts` for the failure-mode write-up.
import { lazyWithReload as lazy } from '@/lib/lazyWithReload';

// Sprint 35 / issue #22: every page is lazy-loaded so the initial chunk
// only ships the shell + Dashboard. Each `import()` becomes its own
// Vite/Rollup chunk fetched on first navigation to that route.
const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const DeviceList = lazy(() => import('@/pages/devices/DeviceList').then((m) => ({ default: m.DeviceList })));
const DeviceDetail = lazy(() => import('@/pages/devices/DeviceDetail').then((m) => ({ default: m.DeviceDetail })));
const DeviceRegister = lazy(() => import('@/pages/devices/DeviceRegister').then((m) => ({ default: m.DeviceRegister })));
const TelemetryDashboard = lazy(() => import('@/pages/telemetry/TelemetryDashboard').then((m) => ({ default: m.TelemetryDashboard })));
const DataExplorer = lazy(() => import('@/pages/telemetry/DataExplorer').then((m) => ({ default: m.DataExplorer })));
const TelemetryModels = lazy(() => import('@/pages/telemetry-models/TelemetryModels').then((m) => ({ default: m.TelemetryModels })));
const RuleList = lazy(() => import('@/pages/rules/RuleList').then((m) => ({ default: m.RuleList })));
const RuleEditor = lazy(() => import('@/pages/rules/RuleEditor').then((m) => ({ default: m.RuleEditor })));
const AlertHistory = lazy(() => import('@/pages/rules/AlertHistory').then((m) => ({ default: m.AlertHistory })));
const IntegrationList = lazy(() => import('@/pages/integrations/IntegrationList').then((m) => ({ default: m.IntegrationList })));
const DeliveryLog = lazy(() => import('@/pages/integrations/DeliveryLog').then((m) => ({ default: m.DeliveryLog })));
const UsageDashboard = lazy(() => import('@/pages/admin/UsageDashboard').then((m) => ({ default: m.UsageDashboard })));
const UserList = lazy(() => import('@/pages/admin/UserList').then((m) => ({ default: m.UserList })));
const UserCreatePage = lazy(() => import('@/pages/admin/UserCreatePage').then((m) => ({ default: m.UserCreatePage })));
const UserDetail = lazy(() => import('@/pages/admin/UserDetail').then((m) => ({ default: m.UserDetail })));
const AuditLog = lazy(() => import('@/pages/admin/AuditLog').then((m) => ({ default: m.AuditLog })));
const DeadLetters = lazy(() => import('@/pages/admin/DeadLetters').then((m) => ({ default: m.DeadLetters })));
const ProductList = lazy(() => import('@/pages/inventory/ProductList').then((m) => ({ default: m.ProductList })));
const ProductDetail = lazy(() => import('@/pages/inventory/ProductDetail').then((m) => ({ default: m.ProductDetail })));
const StockLevels = lazy(() => import('@/pages/inventory/StockLevels').then((m) => ({ default: m.StockLevels })));
const StockMovements = lazy(() => import('@/pages/inventory/StockMovements').then((m) => ({ default: m.StockMovements })));
const TagDataMappings = lazy(() => import('@/pages/inventory/TagDataMappings').then((m) => ({ default: m.TagDataMappings })));
const CsvImport = lazy(() => import('@/pages/inventory/CsvImport').then((m) => ({ default: m.CsvImport })));
const LotExpiryQueue = lazy(() => import('@/pages/inventory/LotExpiryQueue'));
const LotDetail = lazy(() => import('@/pages/inventory/LotDetail'));
const AssetList = lazy(() => import('@/pages/assets/AssetList').then((m) => ({ default: m.AssetList })));
const AssetDetail = lazy(() => import('@/pages/assets/AssetDetail').then((m) => ({ default: m.AssetDetail })));
const SitesZones = lazy(() => import('@/pages/assets/SitesZones').then((m) => ({ default: m.SitesZones })));
const CategoryList = lazy(() => import('@/pages/categories/CategoryList').then((m) => ({ default: m.CategoryList })));
const MapPage = lazy(() => import('@/pages/map/MapPage').then((m) => ({ default: m.MapPage })));
const TenantSettings = lazy(() => import('@/pages/admin/TenantSettings').then((m) => ({ default: m.TenantSettings })));
const Branding = lazy(() => import('@/pages/admin/Branding').then((m) => ({ default: m.Branding })));
const LabelManagement = lazy(() => import('@/pages/admin/LabelManagement').then((m) => ({ default: m.LabelManagement })));
const TagList = lazy(() => import('@/pages/tags/TagList').then((m) => ({ default: m.TagList })));
const TagDetail = lazy(() => import('@/pages/tags/TagDetail').then((m) => ({ default: m.TagDetail })));

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleGlobal401 }),
  mutationCache: new MutationCache({ onError: handleGlobal401 }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Never retry 401s — session is dead, retrying just delays the redirect.
        if (error && typeof error === 'object' && 'status' in error && (error as { status: number }).status === 401) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AntApp>
            <ApiHealthGate>
              <AuthProvider>
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </AuthProvider>
            </ApiHealthGate>
          </AntApp>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

/**
 * Inner route tree extracted from <App /> so tests can mount it inside a
 * <MemoryRouter> without standing up the full provider stack. Keeps the
 * exact lazy declarations + Suspense boundary used in production so
 * App.test.tsx exercises both. Sprint 36 / #25.
 */
export function AppRoutes() {
  return (
    <>
      <RouteTracker />
      <TenantGuard>
        <Suspense
          fallback={
            <div
              data-testid="app-suspense-fallback"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 240,
              }}
            >
              <Spin size="large" />
            </div>
          }
        >
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/devices" element={<DeviceList />} />
              <Route path="/devices/register" element={<DeviceRegister />} />
              <Route path="/devices/:id" element={<DeviceDetail />} />
              <Route path="/telemetry" element={<TelemetryDashboard />} />
              <Route path="/telemetry/explore" element={<DataExplorer />} />
              <Route path="/telemetry-models" element={<TelemetryModels />} />
              <Route path="/rules" element={<RuleList />} />
              <Route path="/rules/new" element={<RuleEditor />} />
              <Route path="/rules/:id/edit" element={<RuleEditor />} />
              <Route path="/alerts" element={<AlertHistory />} />
              <Route path="/integrations" element={<IntegrationList />} />
              <Route path="/integrations/:id/deliveries" element={<DeliveryLog />} />
              <Route path="/assets" element={<AssetList />} />
              <Route path="/assets/:id" element={<AssetDetail />} />
              <Route path="/tags" element={<TagList />} />
              <Route path="/tags/:epcHex" element={<TagDetail />} />
              <Route path="/categories" element={<CategoryList />} />
              <Route path="/sites" element={<SitesZones />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/inventory/products" element={<ProductList />} />
              <Route path="/inventory/products/:id" element={<ProductDetail />} />
              <Route path="/inventory/lots" element={<LotExpiryQueue />} />
              <Route path="/inventory/lots/:id" element={<LotDetail />} />
              <Route path="/inventory/stock-levels" element={<StockLevels />} />
              <Route path="/inventory/stock-movements" element={<StockMovements />} />
              <Route path="/inventory/csv-import" element={<CsvImport />} />
              <Route path="/admin/tenant" element={<TenantSettings />} />
              <Route path="/admin/branding" element={<Branding />} />
              <Route path="/admin/labels" element={<LabelManagement />} />
              <Route path="/admin/tag-data-mappings" element={<TagDataMappings />} />
              <Route path="/admin/usage" element={<UsageDashboard />} />
              <Route path="/admin/users" element={<UserList />} />
              <Route path="/admin/users/new" element={<UserCreatePage />} />
              <Route path="/admin/users/:id" element={<UserDetail />} />
              <Route path="/admin/audit-logs" element={<AuditLog />} />
              <Route path="/admin/dead-letters" element={<DeadLetters />} />
            </Route>
          </Routes>
        </Suspense>
      </TenantGuard>
    </>
  );
}
