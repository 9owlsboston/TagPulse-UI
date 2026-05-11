import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { telemetryModelsApi } from '@/api/client';
import { TelemetryModelsService } from '@/api/generated/services/TelemetryModelsService';
import type { TelemetryModelUpdate } from '@/api/generated/models/TelemetryModelUpdate';
import type { TelemetryModelCreate } from '@/types';

export function useTelemetryModels() {
  return useQuery({
    queryKey: ['telemetry-models'],
    queryFn: () => telemetryModelsApi.list(),
  });
}

export function useTelemetryModel(deviceType: string) {
  return useQuery({
    queryKey: ['telemetry-models', deviceType],
    queryFn: () => telemetryModelsApi.get(deviceType),
    enabled: !!deviceType,
  });
}

export function useCreateTelemetryModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TelemetryModelCreate) => telemetryModelsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['telemetry-models'] }),
  });
}

export function useDeleteTelemetryModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => telemetryModelsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['telemetry-models'] }),
  });
}

// Sprint 28 G6 — edit a telemetry model's metrics list (PATCH from G1).
export function useUpdateTelemetryModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TelemetryModelUpdate }) =>
      TelemetryModelsService.updateTelemetryModelTelemetryModelsModelIdPatch(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['telemetry-models'] }),
  });
}
