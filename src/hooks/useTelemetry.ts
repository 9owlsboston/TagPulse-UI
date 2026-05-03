import { useQuery } from '@tanstack/react-query';
import { telemetryApi } from '@/api/client';
import { TelemetryService } from '@/api/generated/services/TelemetryService';
import type { QuarantineReason } from '@/types';

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

export function useTelemetryQuarantine(params?: {
  device_id?: string;
  reason?: QuarantineReason;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['telemetry', 'quarantine', params],
    queryFn: () =>
      TelemetryService.listTelemetryQuarantineTelemetryQuarantineGet(
        params?.device_id,
        params?.reason,
        params?.limit ?? 100,
        params?.offset,
      ),
  });
}

