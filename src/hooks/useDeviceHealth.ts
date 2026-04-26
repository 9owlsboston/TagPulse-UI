import { useQuery } from '@tanstack/react-query';
import { deviceHealthApi } from '@/api/client';
import { REFETCH_INTERVAL } from '@/lib/constants';

export function useDeviceHealthList(status?: string) {
  return useQuery({
    queryKey: ['device-health', { status }],
    queryFn: () => deviceHealthApi.list(status),
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useDeviceHealth(deviceId: string) {
  return useQuery({
    queryKey: ['device-health', deviceId],
    queryFn: () => deviceHealthApi.get(deviceId),
    enabled: !!deviceId,
  });
}
