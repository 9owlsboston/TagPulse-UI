import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth';

type Role = 'admin' | 'editor' | 'viewer';

/**
 * Conditionally render children based on the user's role.
 * Hidden content is not rendered at all (not just visually hidden).
 */
export function RoleGuard({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { role } = useAuth();
  if (!roles.includes(role)) return null;
  return <>{children}</>;
}

/**
 * Hook to check if the current user has at least the given role level.
 * Role hierarchy: admin > editor > viewer.
 */
export function useCanPerform(minimumRole: Role): boolean {
  const { role } = useAuth();
  const hierarchy: Record<Role, number> = { viewer: 0, editor: 1, admin: 2 };
  return hierarchy[role] >= hierarchy[minimumRole];
}
