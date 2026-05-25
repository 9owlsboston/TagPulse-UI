import { render, screen, act, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Button from 'antd/es/button';
import { ThemeProvider, useThemeMode, THEME_STORAGE_KEY, DEFAULT_BRAND_COLOR } from '@/theme/ThemeProvider';

function ThemeProbe() {
  const { mode, toggleMode, setBrandColor, brandColor } = useThemeMode();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="brand">{brandColor}</span>
      <Button data-testid="toggle" onClick={toggleMode}>toggle</Button>
      <Button data-testid="setbrand" onClick={() => setBrandColor('#ff0000')}>brand</Button>
      <Button data-testid="clearbrand" onClick={() => setBrandColor(null)}>clear</Button>
      <Button data-testid="badbrand" onClick={() => setBrandColor('notahex')}>bad</Button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // Force OS preference to dark so default-mode tests are deterministic.
    // matchMedia is jsdom-mocked; default returns matches:false for every query.
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('defaults to dark mode and the dark-theme accent as the brand colour', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('mode').textContent).toBe('dark');
    expect(screen.getByTestId('brand').textContent).toBe(DEFAULT_BRAND_COLOR);
  });

  it('toggleMode flips dark↔light, persists, and writes data-theme on <html>', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    act(() => {
      fireEvent.click(screen.getByTestId('toggle'));
    });
    expect(screen.getByTestId('mode').textContent).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    act(() => {
      fireEvent.click(screen.getByTestId('toggle'));
    });
    expect(screen.getByTestId('mode').textContent).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('honours a persisted light mode on first mount', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('mode').textContent).toBe('light');
  });

  it('setBrandColor accepts hex, rejects garbage, clears on null', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    act(() => fireEvent.click(screen.getByTestId('setbrand')));
    expect(screen.getByTestId('brand').textContent).toBe('#ff0000');
    act(() => fireEvent.click(screen.getByTestId('badbrand')));
    // Invalid input is ignored — previous override persists.
    expect(screen.getByTestId('brand').textContent).toBe('#ff0000');
    act(() => fireEvent.click(screen.getByTestId('clearbrand')));
    expect(screen.getByTestId('brand').textContent).toBe(DEFAULT_BRAND_COLOR);
  });

  it('useThemeMode returns a safe dark-mode fallback when used outside the provider', () => {
    // Components that only read `mode` for chart colours can render in
    // isolation (in unit tests) without being wrapped in <ThemeProvider>.
    render(<ThemeProbe />);
    expect(screen.getByTestId('mode').textContent).toBe('dark');
    expect(screen.getByTestId('brand').textContent).toBe(DEFAULT_BRAND_COLOR);
  });
});
