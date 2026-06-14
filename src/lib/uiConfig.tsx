/**
 * Configurable-UI context (Sprint 60, ADR-032 — presentation-config consumption).
 *
 * Resolves `GET /ui-config` once near the app root and exposes the effective
 * presentation config app-wide. The backend resolves the full
 * System → Tenant → Role → User per-leaf merge server-side; the UI consumes the
 * resolved document and ignores any leaf it doesn't recognise (ADR-032 §6.4).
 *
 * Leaves consumed today:
 *   - **`labels`** — the display-label skin (`Device` → `Reader`), via
 *     {@link useLabel}. The headline WM ask.
 *   - **`nav`** — sidebar section/item visibility + ordering, via
 *     {@link useNavConfig} (applied in `Layout.tsx`). Lets a tenant simplify
 *     the menu as configuration, not a code edit.
 *   - **`cards`** — per-page card visibility + ordering, via
 *     {@link useCardGroup} (applied in `Dashboard.tsx`) as the *default* layer
 *     beneath the existing device-local localStorage personalisation.
 *   - **`theme`** — persona variant + card style, exposed via
 *     {@link useThemeConfig} and reflected onto `<html>` as
 *     `data-ui-variant` / `data-card-style` (the CSS seam ADR-029 tokens hook).
 *
 * The context is **default-safe**: its default value carries the static
 * `DEFAULT_LABELS` registry and empty nav/cards/theme defaults, so a component
 * that reads config without a surrounding provider (e.g. a unit test mounting
 * one page in isolation) still renders today's UI instead of throwing.
 */
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useUiConfig } from '@/hooks/useUiConfig';
import { DEFAULT_LABELS, pluralizeLabel, type LabelKey, type LabelMap } from '@/lib/uiLabels';

/** Normalised nav-leaf shape (lists always present). */
export interface ResolvedNavConfig {
  hidden: string[];
  order: string[];
}

/** Normalised per-page card-group shape (lists always present). */
export interface ResolvedCardGroup {
  hidden: string[];
  order: string[];
}

/** Normalised theme-leaf shape (defaults = today's UI). */
export interface ResolvedThemeConfig {
  variant: string;
  cardStyle: string;
}

interface UiConfigContextValue {
  /** The resolved label map (canonical defaults overlaid with any skin). */
  labels: LabelMap;
  /** Sidebar visibility + ordering (`nav.hidden` / `nav.order`). */
  nav: ResolvedNavConfig;
  /** Per-page card groups keyed by page name (e.g. `"dashboard"`). */
  cards: Record<string, ResolvedCardGroup>;
  /** Persona theme variant + card style. */
  theme: ResolvedThemeConfig;
}

const EMPTY_NAV: ResolvedNavConfig = { hidden: [], order: [] };
const DEFAULT_THEME: ResolvedThemeConfig = { variant: 'default', cardStyle: 'default' };

const DEFAULT_CONTEXT: UiConfigContextValue = {
  labels: { ...DEFAULT_LABELS },
  nav: EMPTY_NAV,
  cards: {},
  theme: DEFAULT_THEME,
};

const UiConfigContext = createContext<UiConfigContextValue>(DEFAULT_CONTEXT);

export function UiConfigProvider({ children }: { children: ReactNode }) {
  const { data } = useUiConfig();

  const value = useMemo<UiConfigContextValue>(() => {
    const cards: Record<string, ResolvedCardGroup> = {};
    for (const [page, group] of Object.entries(data?.cards ?? {})) {
      cards[page] = { hidden: group?.hidden ?? [], order: group?.order ?? [] };
    }
    return {
      labels: { ...DEFAULT_LABELS, ...(data?.labels ?? {}) },
      nav: { hidden: data?.nav?.hidden ?? [], order: data?.nav?.order ?? [] },
      cards,
      theme: {
        variant: data?.theme?.variant ?? DEFAULT_THEME.variant,
        cardStyle: data?.theme?.cardStyle ?? DEFAULT_THEME.cardStyle,
      },
    };
  }, [data]);

  // Reflect the resolved theme leaf onto <html> as data attributes — the same
  // seam ThemeProvider uses for `data-theme`. ADR-029 token rules (and any
  // future persona styling) hook these selectors; the document carries the
  // values whether or not a stylesheet reacts yet.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-ui-variant', value.theme.variant);
    root.setAttribute('data-card-style', value.theme.cardStyle);
  }, [value.theme.variant, value.theme.cardStyle]);

  return <UiConfigContext.Provider value={value}>{children}</UiConfigContext.Provider>;
}

/** Access the full resolved presentation config (labels / nav / cards / theme). */
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

/** Sidebar visibility + ordering config (`nav.hidden` / `nav.order`). */
// eslint-disable-next-line react-refresh/only-export-components
export function useNavConfig(): ResolvedNavConfig {
  return useUiConfigContext().nav;
}

/**
 * The card-group config for a page (e.g. `"dashboard"`). Always returns a
 * normalised shape so callers never branch on `undefined`.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useCardGroup(page: string): ResolvedCardGroup {
  return useUiConfigContext().cards[page] ?? { hidden: [], order: [] };
}

/** Persona theme variant + card style. */
// eslint-disable-next-line react-refresh/only-export-components
export function useThemeConfig(): ResolvedThemeConfig {
  return useUiConfigContext().theme;
}
