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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

/**
 * Persist the calling user's own presentation overrides (ADR-032 §7 step 2,
 * `PUT /ui-config/me`). The body is a **sparse** subset of the config document;
 * an empty body `{}` clears the user override ("Reset to team default"). On
 * success the resolved config query is invalidated so every consumer
 * (`useLabel` / `useNavConfig` / `useCardGroup` / `useColumnGroup` / …) picks
 * up the freshly-resolved document.
 *
 * `PUT` **replaces the whole user layer** — use it for the explicit
 * reset-everything verb (`{}`). For a composable, leaf-scoped write that
 * doesn't clobber the user's other overrides, prefer {@link usePatchMyUiConfig}.
 */
export function useUpdateMyUiConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (override: UiConfig) => UiConfigService.putUiConfigMeUiConfigMePut(override),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: UI_CONFIG_KEY });
    },
  });
}

/**
 * Deep-merge a sparse override into the calling user's stored prefs (ADR-032
 * v1.3, `PATCH /ui-config/me`). Unlike {@link useUpdateMyUiConfig}'s wholesale
 * `PUT`, this composes per leaf — nested objects recurse, a **list is a leaf
 * and replaces wholesale** — so independent write surfaces (the column chooser
 * writing `columns.<page>`, the Preferences page writing `cards`/`nav`) no
 * longer clobber one another, even though there's no endpoint to read the
 * user's own unmerged layer.
 *
 * The resolved-config cache is updated **optimistically** by deep-merging the
 * body in (mirroring the server's merge so the chooser/table update instantly),
 * rolled back on error, and invalidated on settle so the server's
 * authoritative resolve wins.
 */
export function usePatchMyUiConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (override: UiConfig) => UiConfigService.patchUiConfigMeUiConfigMePatch(override),
    onMutate: async (override: UiConfig) => {
      await qc.cancelQueries({ queryKey: UI_CONFIG_KEY });
      const previous = qc.getQueryData<UiConfig>(UI_CONFIG_KEY);
      if (previous) {
        qc.setQueryData<UiConfig>(UI_CONFIG_KEY, deepMergeUiConfig(previous, override));
      }
      return { previous };
    },
    onError: (_err, _override, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(UI_CONFIG_KEY, ctx.previous);
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: UI_CONFIG_KEY });
    },
  });
}

/**
 * Reset one list page's column override to the team default (ADR-032 v1.3,
 * `DELETE /ui-config/me/columns/{page}`). Drops just the user's
 * `columns.<page>` leaf so that page re-inherits the tenant/role/system floor,
 * leaving every other override intact. Idempotent. No optimistic update — the
 * post-reset resolved value isn't reconstructable client-side (the floor isn't
 * separable from the resolved doc), so we rely on the server's re-resolve via
 * invalidation.
 */
export function useResetMyColumns() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (page: string) =>
      UiConfigService.deleteUiConfigMeColumnsUiConfigMeColumnsPageDelete(page),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: UI_CONFIG_KEY });
    },
  });
}

/**
 * Client-side mirror of the backend's `deep_merge` (ADR-032 §2) used for the
 * optimistic `PATCH` cache update: nested plain objects recurse, every other
 * value — including **lists** — replaces wholesale. Operates on the resolved
 * `UiConfig` cache so the chooser/table reflect the write before the round-trip
 * completes; the server's authoritative resolve replaces it on settle.
 */
export function deepMergeUiConfig(base: UiConfig, override: UiConfig): UiConfig {
  return mergeRecord(base as Record<string, unknown>, override as Record<string, unknown>) as UiConfig;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeRecord(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const existing = out[key];
    if (isPlainObject(existing) && isPlainObject(value)) {
      out[key] = mergeRecord(existing, value);
    } else {
      // Lists and scalars replace wholesale (a list is a leaf, per ADR-032 §2).
      out[key] = value;
    }
  }
  return out;
}
