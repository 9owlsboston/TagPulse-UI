/**
 * BrandSync — Sprint 33 QW6.
 *
 * Side-effect-only component that pulls the authenticated tenant's
 * branding overrides and feeds the `brand_color` into the ThemeProvider
 * so the whole ConfigProvider tree picks it up.
 *
 * Render this once inside the auth tree (e.g. inside `<Layout>`).
 * It returns `null`.
 */
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import { useThemeMode } from '@/theme/ThemeProvider';

export function BrandSync() {
  const { isAuthenticated, user } = useAuth();
  const { setBrandColor } = useThemeMode();
  // Only the API-key login flow yields a real user / role. The tenant-id
  // viewer login has no `/tenant/branding` read access; skip the query to
  // avoid 401s.
  const enabled = isAuthenticated && !!user;
  const { data } = useTenantBranding(enabled);

  useEffect(() => {
    if (!enabled) {
      setBrandColor(null);
      return;
    }
    setBrandColor(data?.brand_color ?? null);
  }, [enabled, data?.brand_color, setBrandColor]);

  return null;
}
