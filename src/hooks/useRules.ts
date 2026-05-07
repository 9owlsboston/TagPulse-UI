import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rulesApi } from '@/api/client';
import { RulesService } from '@/api/generated/services/RulesService';
import type { RuleCreate, RuleUpdate } from '@/types';

/** Shape returned by `GET /rule-templates` (Sprint 20). */
export interface RuleTemplate {
  key: string;
  name: string;
  description: string;
  condition_type: string;
  condition_config: Record<string, unknown>;
  action_type: string;
  action_config: Record<string, unknown>;
  requires_subject_kind: string | null;
}

export function useRuleTemplates() {
  return useQuery({
    queryKey: ['rule-templates'],
    queryFn: async () =>
      (await RulesService.listRuleTemplatesRuleTemplatesGet()) as unknown as RuleTemplate[],
    staleTime: 60_000,
  });
}

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
