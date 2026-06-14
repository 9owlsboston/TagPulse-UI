/**
 * Configurable-UI config hook (Sprint 60, ADR-032 §7 step 1 consumption).
 *
 * Wraps `GET /ui-config`, which the backend resolves **fully server-side** for
 * the calling viewer (System → Tenant → Role → User per-leaf deep-merge). The
 * UI never reconstructs the merge — it consumes the resolved document and
 * ignores any leaf it doesn't recognise (ADR-032 §6.4).
 *
 * Resilient by design: like `useMapConfig`, a failure (e.g. a dev backend
 * without the endpoint yet, or a pre-login 401) is non-fatal — callers fall
 * back to the static `DEFAULT_LABELS` / system defaults so the app still
 * renders today's UI. Long `staleTime` because presentation config changes
 * rarely; `retry: false` so a missing endpoint doesn't thrash.
 */
import { useQuery } from '@tanstack/react-query';
import { UiConfigService } from '@/api/generated/services/UiConfigService';
import type { UiConfig } from '@/api/generated/models/UiConfig';

export const UI_CONFIG_KEY = ['ui-config'] as const;

export function useUiConfig() {
  return useQuery<UiConfig>({
    queryKey: UI_CONFIG_KEY,
    queryFn: () => UiConfigService.getUiConfigUiConfigGet(),
    staleTime: 5 * 60_000,
    retry: false,
  });
}
