import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TpSparkline } from '@/components/charts/TpSparkline';

vi.mock('@/theme/ThemeProvider', () => ({
  useThemeMode: () => ({ mode: 'light' as const, setMode: vi.fn() }),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="rc-responsive">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <svg data-testid="rc-svg">{children}</svg>
  ),
  Area: ({ stroke, dot }: { stroke?: string; dot?: unknown }) => (
    <g
      data-testid="rc-line"
      data-stroke={stroke}
      data-has-dot-fn={typeof dot === 'function' ? 'true' : 'false'}
    />
  ),
}));

function makeRows(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    t: new Date(Date.parse('2026-05-01T00:00:00Z') + i * 60000).toISOString(),
    v: i * 2,
  }));
}

describe('TpSparkline', () => {
  it('renders chart and SR summary with first/last/min/max', () => {
    render(<TpSparkline data={makeRows(5)} dataKey="v" xKey="t" />);
    expect(screen.getByTestId('tp-sparkline')).toBeInTheDocument();
    expect(screen.getByTestId('rc-svg')).toBeInTheDocument();
    expect(screen.getByTestId('tp-sparkline-summary')).toHaveTextContent(
      /Sparkline of v across 5 points; first 0, last 8, min 0, max 8\./,
    );
  });

  it('uses default token palette colour when none provided', () => {
    render(<TpSparkline data={makeRows(2)} dataKey="v" />);
    const line = screen.getByTestId('rc-line');
    expect(line.getAttribute('data-stroke')).toBeTruthy();
  });

  it('respects custom colour override', () => {
    render(<TpSparkline data={makeRows(2)} dataKey="v" color="#ff00ff" />);
    expect(screen.getByTestId('rc-line').getAttribute('data-stroke')).toBe('#ff00ff');
  });

  it('omits the chart entirely when data is empty', () => {
    render(<TpSparkline data={[]} dataKey="v" />);
    expect(screen.getByTestId('tp-sparkline')).toBeInTheDocument();
    expect(screen.queryByTestId('rc-svg')).not.toBeInTheDocument();
    expect(screen.getByTestId('tp-sparkline-summary')).toHaveTextContent(
      /Sparkline with no data points\./,
    );
  });

  it('applies role="img" with aria-label fallback to summary', () => {
    render(<TpSparkline data={makeRows(2)} dataKey="v" />);
    const fig = screen.getByRole('img');
    expect(fig.getAttribute('aria-label')).toMatch(/Sparkline of v across 2 points/);
  });

  it('uses explicit ariaLabel when provided', () => {
    render(
      <TpSparkline
        data={makeRows(2)}
        dataKey="v"
        ariaLabel="Reads last 24h"
      />,
    );
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe('Reads last 24h');
  });

  it('passes a custom dot renderer (for the last-point dot affordance)', () => {
    render(<TpSparkline data={makeRows(4)} dataKey="v" />);
    expect(screen.getByTestId('rc-line').getAttribute('data-has-dot-fn')).toBe('true');
  });
});
