import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rulesApi } from '@/api/client';
import type { RuleCreate, RuleUpdate } from '@/types';

export function useRules(enabledOnly?: boolean) {
  return useQuery({
    queryKey: ['rules', { enabledOnly }],
    queryFn: () => rulesApi.list(enabledOnly),
  });
}

export function useRule(id: string) {
  return useQuery({
    queryKey: ['rules', id],
    queryFn: () => rulesApi.get(id),
    enabled: !!id,
  });
}

export function useCreateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RuleCreate) => rulesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rules'] }),
  });
}

export function useUpdateRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: RuleUpdate }) => rulesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rules'] }),
  });
}

export function useDeleteRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rulesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rules'] }),
  });
}
