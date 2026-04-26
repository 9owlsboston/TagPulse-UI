import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { devicesApi } from '@/api/client';
import type { DeviceCreate, DeviceUpdate } from '@/types';
import { REFETCH_INTERVAL } from '@/lib/constants';

export function useDevices(params?: { status?: string; device_type?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['devices', params],
    queryFn: () => devicesApi.list(params),
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useDevice(id: string) {
  return useQuery({
    queryKey: ['devices', id],
    queryFn: () => devicesApi.get(id),
  });
}

export function useCreateDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DeviceCreate) => devicesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
  });
}

export function useUpdateDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DeviceUpdate }) => devicesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
  });
}

export function useDecommissionDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => devicesApi.decommission(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
  });
}
