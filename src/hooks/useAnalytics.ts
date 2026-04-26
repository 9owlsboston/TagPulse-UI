import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/api/client';
import { usageApi } from '@/api/client';

export function useReadFrequency(params?: { device_id?: string; start?: string; end?: string; metric?: string; limit?: number }) {
  return useQuery({
    queryKey: ['analytics', 'read-frequency', params],
    queryFn: () => analyticsApi.readFrequency(params),
  });
}

export function useUsage(params?: { start?: string; end?: string }) {
  return useQuery({
    queryKey: ['usage', params],
    queryFn: () => usageApi.list(params),
  });
}

export function useUsageSummary(params?: { start?: string; end?: string }) {
  return useQuery({
    queryKey: ['usage', 'summary', params],
    queryFn: () => usageApi.summary(params),
  });
}
