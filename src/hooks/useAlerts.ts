import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi } from '@/api/client';

export function useAlerts(params?: { rule_id?: string; device_id?: string; status?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['alerts', params],
    queryFn: () => alertsApi.list(params),
  });
}

export function useAcknowledgeAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => alertsApi.acknowledge(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });
}
