import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { TenantGuard } from '@/components/TenantGuard';
import { Layout } from '@/components/Layout';
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
import { ProductList } from '@/pages/inventory/ProductList';
import { ProductDetail } from '@/pages/inventory/ProductDetail';
import { StockLevels } from '@/pages/inventory/StockLevels';
import { StockMovements } from '@/pages/inventory/StockMovements';
import { TagDataMappings } from '@/pages/inventory/TagDataMappings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
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
                <Route path="/inventory/products" element={<ProductList />} />
                <Route path="/inventory/products/:id" element={<ProductDetail />} />
                <Route path="/inventory/stock-levels" element={<StockLevels />} />
                <Route path="/inventory/stock-movements" element={<StockMovements />} />
                <Route path="/admin/tag-data-mappings" element={<TagDataMappings />} />
                <Route path="/admin/usage" element={<UsageDashboard />} />
                <Route path="/admin/users" element={<UserList />} />
                <Route path="/admin/users/new" element={<UserCreatePage />} />
                <Route path="/admin/users/:id" element={<UserDetail />} />
              </Route>
            </Routes>
          </TenantGuard>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
