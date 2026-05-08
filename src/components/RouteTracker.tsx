// Sprint 25 C2 — React Router → App Insights page-view tracking.
//
// Mounted inside <BrowserRouter>. Calls trackPageView() on every route change.
// Cardinality: high-cardinality segments (UUIDs, device ids) are normalized
// to `:id` so App Insights groups dynamic routes correctly. Renders nothing.

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/lib/telemetry';
import { normalizeRoutePattern } from '@/lib/routes';

export function RouteTracker(): null {
  const location = useLocation();

  useEffect(() => {
    const name = normalizeRoutePattern(location.pathname);
    trackPageView(name, location.pathname);
  }, [location.pathname]);

  return null;
}
