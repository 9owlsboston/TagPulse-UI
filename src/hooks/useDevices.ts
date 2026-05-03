import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { devicesApi } from '@/api/client';
import { DeviceRegistryService } from '@/api/generated/services/DeviceRegistryService';
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

export function useRotateDeviceToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => devicesApi.rotateToken(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['devices'] });
      qc.invalidateQueries({ queryKey: ['devices', id] });
    },
  });
}

/** Sprint 17b — attach a client cert (admin only) to a device. */
export function useAttachDeviceCert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cert_pem }: { id: string; cert_pem: string }) =>
      DeviceRegistryService.attachDeviceCertDeviceRegistryDeviceIdCertPost(id, { cert_pem }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['devices'] });
      qc.invalidateQueries({ queryKey: ['devices', vars.id] });
    },
  });
}
