import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { TenantGuard } from '@/components/TenantGuard';
import { Layout } from '@/components/Layout';
import { ApiHealthGate } from '@/components/ApiHealthGate';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteTracker } from '@/components/RouteTracker';
import { handleGlobal401 } from '@/lib/auth';
import { Dashboard } from '@/pages/Dashboard';
import { DeviceList } from '@/pages/devices/DeviceList';
import { DeviceDetail } from '@/pages/devices/DeviceDetail';
import { DeviceRegister } from '@/pages/devices/DeviceRegister';
import { TelemetryDashboard } from '@/pages/telemetry/TelemetryDashboard';
import { DataExplorer } from '@/pages/telemetry/DataExplorer';
import { TelemetryModels } from '@/pages/telemetry-models/TelemetryModels';
import { RuleList } from '@/pages/rules/RuleList';
import { RuleEditor } from '@/pages/rules/RuleEditor';
import { AlertHistory } from '@/pages/rules/AlertHistory';
import { IntegrationList } from '@/pages/integrations/IntegrationList';
import { DeliveryLog } from '@/pages/integrations/DeliveryLog';
import { UsageDashboard } from '@/pages/admin/UsageDashboard';
import { UserList } from '@/pages/admin/UserList';
import { UserCreatePage } from '@/pages/admin/UserCreatePage';
import { UserDetail } from '@/pages/admin/UserDetail';
import { AuditLog } from '@/pages/admin/AuditLog';
import { ProductList } from '@/pages/inventory/ProductList';
import { ProductDetail } from '@/pages/inventory/ProductDetail';
import { StockLevels } from '@/pages/inventory/StockLevels';
import { StockMovements } from '@/pages/inventory/StockMovements';
import { TagDataMappings } from '@/pages/inventory/TagDataMappings';
import LotExpiryQueue from '@/pages/inventory/LotExpiryQueue';
import LotDetail from '@/pages/inventory/LotDetail';
import { AssetList } from '@/pages/assets/AssetList';
import { AssetDetail } from '@/pages/assets/AssetDetail';
import { SitesZones } from '@/pages/assets/SitesZones';
import { MapPage } from '@/pages/map/MapPage';
import { TenantSettings } from '@/pages/admin/TenantSettings';

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
        <ApiHealthGate>
          <AuthProvider>
            <BrowserRouter>
              <RouteTracker />
              <TenantGuard>
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
                <Route path="/sites" element={<SitesZones />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/inventory/products" element={<ProductList />} />
                <Route path="/inventory/products/:id" element={<ProductDetail />} />
                <Route path="/inventory/lots" element={<LotExpiryQueue />} />
                <Route path="/inventory/lots/:id" element={<LotDetail />} />
                <Route path="/inventory/stock-levels" element={<StockLevels />} />
                <Route path="/inventory/stock-movements" element={<StockMovements />} />
                <Route path="/admin/tenant" element={<TenantSettings />} />
                <Route path="/admin/tag-data-mappings" element={<TagDataMappings />} />
                <Route path="/admin/usage" element={<UsageDashboard />} />
                <Route path="/admin/users" element={<UserList />} />
                <Route path="/admin/users/new" element={<UserCreatePage />} />
                <Route path="/admin/users/:id" element={<UserDetail />} />
                <Route path="/admin/audit-logs" element={<AuditLog />} />
              </Route>
            </Routes>
              </TenantGuard>
            </BrowserRouter>
          </AuthProvider>
        </ApiHealthGate>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
