import { useQuery } from '@tanstack/react-query';
import { usageApi } from '@/api/client';

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
