/**
 * Configurable-UI context (Sprint 60, ADR-032 §4 `labels` consumption).
 *
 * Resolves `GET /ui-config` once near the app root and exposes the effective
 * presentation config app-wide. The first surface consumed is the **label
 * skin** — the headline WM ask (`Device` → `Reader`) — via {@link useLabel}.
 *
 * The context is **default-safe**: its default value is the static
 * `DEFAULT_LABELS` registry, so a component that reads a label without a
 * surrounding provider (e.g. a unit test mounting one page in isolation) still
 * renders today's terms instead of throwing. The provider merges the
 * server-resolved label map over the defaults so every registered term always
 * resolves.
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useUiConfig } from '@/hooks/useUiConfig';
import { DEFAULT_LABELS, pluralizeLabel, type LabelKey, type LabelMap } from '@/lib/uiLabels';

interface UiConfigContextValue {
  /** The resolved label map (canonical defaults overlaid with any skin). */
  labels: LabelMap;
}

const UiConfigContext = createContext<UiConfigContextValue>({
  labels: { ...DEFAULT_LABELS },
});

export function UiConfigProvider({ children }: { children: ReactNode }) {
  const { data } = useUiConfig();
  const value = useMemo<UiConfigContextValue>(
    () => ({ labels: { ...DEFAULT_LABELS, ...(data?.labels ?? {}) } }),
    [data?.labels],
  );
  return <UiConfigContext.Provider value={value}>{children}</UiConfigContext.Provider>;
}

/** Access the full resolved presentation config (currently just `labels`). */
// eslint-disable-next-line react-refresh/only-export-components
export function useUiConfigContext(): UiConfigContextValue {
  return useContext(UiConfigContext);
}

/**
 * Resolve a registered term to its effective display label.
 *
 * Pass `{ plural: true }` for plural surfaces (nav, list-page headers) — the
 * singular skin is pluralized with regular English rules. Returns today's
 * canonical term when no skin is configured.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useLabel(key: LabelKey, opts?: { plural?: boolean }): string {
  const { labels } = useUiConfigContext();
  const singular = labels[key] ?? DEFAULT_LABELS[key];
  return opts?.plural ? pluralizeLabel(singular) : singular;
}
