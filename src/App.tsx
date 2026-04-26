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
                <Route path="/admin/usage" element={<UsageDashboard />} />
              </Route>
            </Routes>
          </TenantGuard>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
