import { useAuth } from '@/lib/auth';

type Role = 'admin' | 'editor' | 'viewer';

/**
 * Hook to check if the current user has at least the given role level.
 * Role hierarchy: admin > editor > viewer.
 */
export function useCanPerform(minimumRole: Role): boolean {
  const { role } = useAuth();
  const hierarchy: Record<Role, number> = { viewer: 0, editor: 1, admin: 2 };
  return hierarchy[role] >= hierarchy[minimumRole];
}
