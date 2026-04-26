import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { integrationsApi } from '@/api/client';
import type { IntegrationCreate, IntegrationUpdate } from '@/types';

export function useIntegrations() {
  return useQuery({
    queryKey: ['integrations'],
    queryFn: () => integrationsApi.list(),
  });
}

export function useIntegration(id: string) {
  return useQuery({
    queryKey: ['integrations', id],
    queryFn: () => integrationsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: IntegrationCreate) => integrationsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
  });
}

export function useUpdateIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: IntegrationUpdate }) => integrationsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
  });
}

export function useDeleteIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => integrationsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['integrations'] }),
  });
}

export function useDeliveries(integrationId: string, params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['integrations', integrationId, 'deliveries', params],
    queryFn: () => integrationsApi.deliveries(integrationId, params),
    enabled: !!integrationId,
  });
}
