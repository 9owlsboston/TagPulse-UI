import { useQuery } from '@tanstack/react-query';
import { telemetryApi } from '@/api/client';

export function useDeviceTelemetry(params?: {
  device_id?: string;
  metric_name?: string;
  start?: string;
  end?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['telemetry', params],
    queryFn: () => telemetryApi.list(params),
    enabled: !!params?.device_id,
  });
}
