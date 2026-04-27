import { useQuery } from '@tanstack/react-query';
import { tagReadsApi } from '@/api/client';
import { REFETCH_INTERVAL } from '@/lib/constants';

export function useTagReads(params?: { device_id?: string; tag_id?: string; start?: string; end?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['tag-reads', params],
    queryFn: () => tagReadsApi.list(params),
  });
}

export function useReadsPerHour(params?: { device_id?: string; start?: string; end?: string }) {
  return useQuery({
    queryKey: ['tag-reads', 'reads-per-hour', params],
    queryFn: () => tagReadsApi.readsPerHour(params),
    refetchInterval: REFETCH_INTERVAL,
  });
}

export function useUniqueTags(params?: { device_id?: string; start?: string; end?: string; window_minutes?: number }) {
  return useQuery({
    queryKey: ['tag-reads', 'unique-tags', params],
    queryFn: () => tagReadsApi.uniqueTags(params),
  });
}

export function useRecentReads(deviceId: string, limit?: number) {
  return useQuery({
    queryKey: ['tag-reads', 'recent', deviceId, limit],
    queryFn: () => tagReadsApi.recentReads(deviceId, limit),
  });
}
