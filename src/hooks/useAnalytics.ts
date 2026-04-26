import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/api/client';

export function useReadFrequency(params?: { device_id?: string; start?: string; end?: string; metric?: string; limit?: number }) {
  return useQuery({
    queryKey: ['analytics', 'read-frequency', params],
    queryFn: () => analyticsApi.readFrequency(params),
  });
}
