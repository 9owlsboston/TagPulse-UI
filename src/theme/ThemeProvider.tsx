/**
 * ThemeProvider — Sprint 33 QW1 + QW5 + QW6.
 *
 * Wraps the app in an AntD ConfigProvider that exposes:
 *   • A Tailwind blue-600 default `colorPrimary` (#2563eb), aligning
 *     TagPulse with the reference design's primary accent.
 *   • A light/dark mode toggle (QW5) persisted in localStorage under
 *     `tagpulse.theme`. First visit honours the OS preference via
 *     `prefers-color-scheme`.
 *   • An override hook so per-tenant branding (QW6) can swap the brand
 *     colour at runtime without re-mounting the tree. Setting `null`
 *     reverts to the default blue.
 *
 * The provider also exposes a `useThemeMode()` hook returning the
 * current mode plus toggles for the Account dropdown (QW3).
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

export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'tagpulse.theme';
// Tailwind blue-600 — the reference-design primary. Tenant branding
// (QW6) can override this at runtime via `setBrandColor()`.
export const DEFAULT_BRAND_COLOR = '#2563eb';

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
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Storage unavailable (private mode, etc.) — fall through to OS pref.
  }
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
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

  const brandColor = brandOverride ?? DEFAULT_BRAND_COLOR;
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
            colorPrimary: brandColor,
            borderRadius: 6,
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeMode must be used inside <ThemeProvider>');
  }
  return ctx;
}
