import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/api/client';
import { REFETCH_INTERVAL } from '@/lib/constants';

export function useReadFrequency(params?: { device_id?: string; start?: string; end?: string; metric?: string; limit?: number }) {
  return useQuery({
    queryKey: ['analytics', 'read-frequency', params],
    queryFn: () => analyticsApi.readFrequency(params),
    refetchInterval: REFETCH_INTERVAL,
  });
}
