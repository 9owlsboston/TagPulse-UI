/**
 * ThemeProvider — Sprint 33 QW1 + QW5 + QW6, reworked in Sprint 54
 * Phase 54.1 to drive the design-token system (ADR-029).
 *
 * Responsibilities:
 *   • Toggle `data-theme="light"|"dark"` on `<html>`. **No other code
 *     in the app reads or writes this attribute.** Semantic colours
 *     resolve through CSS custom properties in `tokens.css`.
 *   • Mirror the semantic token catalog (`tokens.ts`) into the AntD
 *     `ConfigProvider` so AntD primitives match the rest of the app.
 *   • Persist user preference under `tagpulse.theme`; first visit
 *     honours the OS preference via `prefers-color-scheme`. An inline
 *     pre-paint script in `index.html` applies the same logic before
 *     React mounts to avoid a theme-flash on load.
 *   • Per-tenant brand-colour override (QW6): if set, replaces the
 *     semantic `accent` only (charts, success/warning/danger are
 *     unaffected). Set `null` to revert.
 */
import ConfigProvider from 'antd/es/config-provider';
import theme from 'antd/es/theme';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { tokens } from './tokens';
import type { ThemeMode } from './themeMode';
export type { ThemeMode } from './themeMode';

export const THEME_STORAGE_KEY = 'tagpulse.theme';
export const THEME_ATTR = 'data-theme';
// Tenant brand-colour override default: the dark-theme accent. Tenant
// branding (QW6) can override this at runtime via `setBrandColor()`.
export const DEFAULT_BRAND_COLOR = tokens.dark.colorAccent;

interface ThemeContextValue {
  mode: ThemeMode;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
  brandColor: string;
  /** Set tenant-branding override. Pass `null` to revert to the default. */
  setBrandColor: (color: string | null) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readInitialMode(): ThemeMode {
  // ADR-029: dark is the default theme. We only flip to light if the
  // user explicitly chose it, or (on first visit, no choice stored)
  // the OS reports a light preference.
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Storage unavailable (private mode, etc.) — fall through to OS pref.
  }
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readInitialMode);
  const [brandOverride, setBrandOverride] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Best-effort; private mode etc.
    }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute(THEME_ATTR, mode);
    }
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => setModeState(next), []);
  const toggleMode = useCallback(
    () => setModeState((prev) => (prev === 'light' ? 'dark' : 'light')),
    [],
  );
  const setBrandColor = useCallback((color: string | null) => {
    if (color === null) {
      setBrandOverride(null);
      return;
    }
    if (!HEX_RE.test(color)) return;
    setBrandOverride(color);
  }, []);

  const t = tokens[mode];
  const brandColor = brandOverride ?? t.colorAccent;
  const algorithm = mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm;

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, toggleMode, setMode, brandColor, setBrandColor }),
    [mode, toggleMode, setMode, brandColor, setBrandColor],
  );

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider
        theme={{
          algorithm,
          token: {
            // Semantic → AntD primitive mirror. Keep in lockstep with
            // tokens.ts so AntD components match CSS-var consumers.
            colorPrimary: brandColor,
            colorBgLayout: t.colorBg,
            colorBgContainer: t.colorSurface,
            colorBgElevated: t.colorSurfaceRaised,
            colorText: t.colorText,
            colorTextSecondary: t.colorTextMuted,
            colorBorder: t.colorBorder,
            colorBorderSecondary: t.colorBorder,
            colorSuccess: t.colorSuccess,
            colorWarning: t.colorWarning,
            colorError: t.colorDanger,
            borderRadius: 6,
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

// Fallback context for callers that render outside a `<ThemeProvider>`
// (notably unit tests for components that only read `mode` for chart
// colours). Returns the dark default with no-op setters so components
// render without crashing; real provider always wins when present.
const FALLBACK_CONTEXT: ThemeContextValue = {
  mode: 'dark',
  toggleMode: () => {},
  setMode: () => {},
  brandColor: DEFAULT_BRAND_COLOR,
  setBrandColor: () => {},
};

// eslint-disable-next-line react-refresh/only-export-components
export function useThemeMode(): ThemeContextValue {
  return useContext(ThemeContext) ?? FALLBACK_CONTEXT;
}
