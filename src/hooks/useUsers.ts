import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/client';
import type { UserCreate, UserUpdate } from '@/types';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UserCreate) => usersApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserUpdate }) => usersApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useGenerateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => usersApi.generateApiKey(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useRevokeApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => usersApi.revokeApiKey(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
