/**
 * Sprint 57 Phase C.5 — smoke test for /dev/charts playground.
 * Recharts is mocked at module scope so the playground mounts quickly.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChartsPlayground } from './ChartsPlayground';

vi.mock('@/theme/ThemeProvider', () => ({
  useThemeMode: () => ({ mode: 'light' as const, setMode: vi.fn() }),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="rc-responsive">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <svg data-testid="rc-svg">{children}</svg>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <svg data-testid="rc-svg">{children}</svg>
  ),
  Line: ({ name }: { name?: string }) => <g data-testid={`rc-line-${name ?? ''}`} />,
  Area: ({ name }: { name?: string }) => <g data-testid={`rc-area-${name ?? ''}`} />,
  XAxis: () => <g />,
  YAxis: () => <g />,
  CartesianGrid: () => <g />,
  Tooltip: () => <g />,
}));

describe('ChartsPlayground', () => {
  it('mounts every section', () => {
    render(<ChartsPlayground />);
    expect(screen.getByTestId('charts-playground')).toBeInTheDocument();
    for (const id of [
      'line-single',
      'line-few',
      'line-many',
      'line-empty',
      'line-loading',
      'line-error',
      'area-overlay',
      'area-stacked',
      'sparkline-row',
    ]) {
      expect(screen.getByTestId(`playground-section-${id}`)).toBeInTheDocument();
    }
  });
});
