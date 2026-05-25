/**
 * Design token catalog — Sprint 54 Phase 54.1 (ADR-029).
 *
 * Source of truth for the semantic token layer. CSS custom properties
 * declared in `tokens.css` mirror these values; a parity test in
 * `tokens.test.ts` catches drift. Components consume the semantic
 * layer via CSS vars (`var(--color-…)`) or via the JS export below
 * when an inline style or AntD `ConfigProvider` wiring needs the raw
 * value. Primitive (`palette*`) values are never consumed directly
 * outside this file.
 *
 * Hard rules (ADR-029 §Hard rules):
 *  1. Components/pages use the semantic layer, not primitives.
 *  2. Zero hardcoded hex / zero `!important` in `src/components/` and
 *     `src/pages/` (audit script: `npm run check:tokens`).
 *  3. AntD `ConfigProvider` mirrors the semantic layer — see
 *     `ThemeProvider.tsx`.
 *  4. `ThemeProvider` is the only toggler. No component reads or
 *     writes `data-theme` directly.
 *  5. `/dev/tokens` debug page is the Phase 54.1 acceptance artifact.
 */

import type { ThemeMode } from './themeMode';

// Primitive palette — colour atoms only. Not consumed outside this file.
const palette = {
  dark: {
    bg: '#0F0F0F',
    surface: '#1A1A1A',
    surfaceRaised: '#262626',
    accent: '#4CC2FF',
    success: '#3DDC84',
    warning: '#FFB74D',
    danger: '#FF5252',
    text: 'rgba(255, 255, 255, 0.88)',
    textMuted: 'rgba(255, 255, 255, 0.55)',
    border: 'rgba(255, 255, 255, 0.12)',
    // Chart series — 6-colour categorical scale (ADR-029 calls colour
    // tokens in scope; chart palette is colour, so it lives here).
    chart: ['#4CC2FF', '#3DDC84', '#FFB74D', '#FF5252', '#B388FF', '#26C6DA'] as const,
  },
  light: {
    bg: '#F5F5F5',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    accent: '#0078D4',
    success: '#107C10',
    warning: '#D88C1A',
    danger: '#C42B1C',
    text: 'rgba(0, 0, 0, 0.88)',
    textMuted: 'rgba(0, 0, 0, 0.55)',
    border: '#F0F0F0',
    chart: ['#0078D4', '#107C10', '#D88C1A', '#C42B1C', '#7B1FA2', '#0097A7'] as const,
  },
} as const;

/**
 * Semantic role → resolved value, per theme. The CSS file mirrors
 * these names (`--color-bg`, `--color-accent`, etc.). Add a new role
 * here, mirror it in `tokens.css`, and the parity test will keep them
 * in sync.
 */
export interface SemanticTokens {
  colorBg: string;
  colorSurface: string;
  colorSurfaceRaised: string;
  colorAccent: string;
  colorSuccess: string;
  colorWarning: string;
  colorDanger: string;
  colorText: string;
  colorTextMuted: string;
  colorBorder: string;
  /** 6-colour categorical chart series. */
  chartSeries: readonly string[];
}

function resolve(mode: ThemeMode): SemanticTokens {
  const p = palette[mode];
  return {
    colorBg: p.bg,
    colorSurface: p.surface,
    colorSurfaceRaised: p.surfaceRaised,
    colorAccent: p.accent,
    colorSuccess: p.success,
    colorWarning: p.warning,
    colorDanger: p.danger,
    colorText: p.text,
    colorTextMuted: p.textMuted,
    colorBorder: p.border,
    chartSeries: p.chart,
  };
}

export const tokens: Record<ThemeMode, SemanticTokens> = {
  dark: resolve('dark'),
  light: resolve('light'),
};

/**
 * CSS custom-property name for a semantic role. Keep in sync with the
 * selectors in `tokens.css`.
 */
export const cssVar = {
  bg: 'var(--color-bg)',
  surface: 'var(--color-surface)',
  surfaceRaised: 'var(--color-surface-raised)',
  accent: 'var(--color-accent)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  text: 'var(--color-text)',
  textMuted: 'var(--color-text-muted)',
  border: 'var(--color-border)',
  chart: (n: 1 | 2 | 3 | 4 | 5 | 6) => `var(--color-chart-${n})`,
} as const;

/**
 * Roles enumerated for the `/dev/tokens` debug page and the parity test.
 * Order is the rendering order on the debug page.
 */
export const semanticRoles = [
  { name: 'bg', cssVar: '--color-bg', description: 'Page background' },
  { name: 'surface', cssVar: '--color-surface', description: 'Card / panel surface' },
  {
    name: 'surface-raised',
    cssVar: '--color-surface-raised',
    description: 'Modal / drawer / popover (one notch above surface)',
  },
  { name: 'accent', cssVar: '--color-accent', description: 'Primary action, active nav, focus ring' },
  { name: 'success', cssVar: '--color-success', description: 'Healthy KPI / success toast' },
  { name: 'warning', cssVar: '--color-warning', description: 'Degraded KPI / warning toast' },
  { name: 'danger', cssVar: '--color-danger', description: 'Alert KPI / destructive action' },
  { name: 'text', cssVar: '--color-text', description: 'Primary text on surface' },
  { name: 'text-muted', cssVar: '--color-text-muted', description: 'Secondary text on surface' },
  { name: 'border', cssVar: '--color-border', description: '1px dividers' },
  { name: 'chart-1', cssVar: '--color-chart-1', description: 'Chart series 1' },
  { name: 'chart-2', cssVar: '--color-chart-2', description: 'Chart series 2' },
  { name: 'chart-3', cssVar: '--color-chart-3', description: 'Chart series 3' },
  { name: 'chart-4', cssVar: '--color-chart-4', description: 'Chart series 4' },
  { name: 'chart-5', cssVar: '--color-chart-5', description: 'Chart series 5' },
  { name: 'chart-6', cssVar: '--color-chart-6', description: 'Chart series 6' },
] as const;

export type SemanticRoleName = (typeof semanticRoles)[number]['name'];
