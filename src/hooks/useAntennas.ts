/**
 * Antenna placement hooks (Sprint 64 Phase 1).
 *
 * Wraps the generated `AntennasService`. Port 0 is the reader's nominal
 * location; ports 1..N are individual radiators. Antennas are device-scoped.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AntennasService } from '@/api/generated/services/AntennasService';
import type { AntennaUpsert } from '@/api/generated/models/AntennaUpsert';

export function useAntennas(deviceId: string | undefined) {
  return useQuery({
    queryKey: ['antennas', deviceId],
    queryFn: () => AntennasService.listAntennasDevicesDeviceIdAntennasGet(deviceId!),
    enabled: Boolean(deviceId),
  });
}

export function useUpsertAntenna() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      deviceId,
      port,
      data,
    }: {
      deviceId: string;
      port: number;
      data: AntennaUpsert;
    }) => AntennasService.upsertAntennaDevicesDeviceIdAntennasPortPut(deviceId, port, data),
    onSuccess: (_r, vars) => qc.invalidateQueries({ queryKey: ['antennas', vars.deviceId] }),
  });
}

export function useDeleteAntenna() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ deviceId, port }: { deviceId: string; port: number }) =>
      AntennasService.deleteAntennaDevicesDeviceIdAntennasPortDelete(deviceId, port),
    onSuccess: (_r, vars) => qc.invalidateQueries({ queryKey: ['antennas', vars.deviceId] }),
  });
}
