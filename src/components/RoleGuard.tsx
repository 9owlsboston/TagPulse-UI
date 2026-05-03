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
