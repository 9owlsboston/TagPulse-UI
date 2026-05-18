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
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('defaults to light mode and the Tailwind blue-600 brand colour', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('mode').textContent).toBe('light');
    expect(screen.getByTestId('brand').textContent).toBe(DEFAULT_BRAND_COLOR);
  });

  it('toggleMode flips light↔dark and persists the choice', () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    act(() => {
      fireEvent.click(screen.getByTestId('toggle'));
    });
    expect(screen.getByTestId('mode').textContent).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    act(() => {
      fireEvent.click(screen.getByTestId('toggle'));
    });
    expect(screen.getByTestId('mode').textContent).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('honours a persisted dark mode on first mount', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('mode').textContent).toBe('dark');
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

  it('useThemeMode throws when used outside the provider', () => {
    // Silence the React error boundary log noise for this assertion-only test.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThemeProbe />)).toThrow(/useThemeMode/);
    spy.mockRestore();
  });
});
