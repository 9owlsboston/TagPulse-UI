import { useQuery } from '@tanstack/react-query';
import { telemetryApi } from '@/api/client';
import { TelemetryService } from '@/api/generated/services/TelemetryService';
import type { QuarantineReason } from '@/types';

export type SubjectKind = 'device' | 'asset' | 'lot' | 'stock_item' | 'zone';

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

/**
 * Subject-scoped telemetry readings (Sprint 19/20/21 — `GET /telemetry/readings`).
 *
 * Replaces the device-only `GET /telemetry` for asset/lot/stock_item/zone
 * surfaces. `enabled` is gated on a non-empty `subject_id` so callers can
 * mount the hook before the parent record is loaded.
 */
export function useSubjectTelemetry(params: {
  subject_kind: SubjectKind;
  subject_id?: string;
  metric_name?: string;
  start?: string;
  end?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['telemetry', 'readings', params],
    queryFn: () =>
      TelemetryService.listTelemetryReadingsTelemetryReadingsGet(
        params.subject_kind,
        params.subject_id ?? '',
        params.metric_name,
        params.start,
        params.end,
        params.limit ?? 500,
      ),
    enabled: !!params.subject_id,
  });
}

