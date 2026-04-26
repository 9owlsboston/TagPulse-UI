import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { telemetryModelsApi } from '@/api/client';
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
