import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { KpiTile } from '@/components/KpiTile';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { SparklineSeries } from '@/types';

// Recharts pulls in ResponsiveContainer which calls ResizeObserver — not in
// jsdom. Stub the few primitives <TpSparkline> uses so the chip just renders
// a placeholder node and our assertions stay focused on KpiTile behaviour.
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="rc-responsive">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <svg data-testid="rc-svg">{children}</svg>
  ),
  Area: () => <g />,
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('KpiTile (Sprint 57 Phase F)', () => {
  it('renders without a sparkline by default', () => {
    render(<KpiTile title="Devices" value={12} />, { wrapper });
    expect(screen.getByText('Devices')).toBeInTheDocument();
    expect(screen.queryByTestId('kpi-tile-sparkline')).not.toBeInTheDocument();
  });

  it('renders inline sparkline when prop is provided with points', () => {
    const sparkline: SparklineSeries = {
      trend: 'up',
      series: [
        { t: '2026-05-25T00:00:00Z', v: 10 },
        { t: '2026-05-26T00:00:00Z', v: 14 },
      ],
    };
    render(
      <KpiTile title="Devices" value={14} sparkline={sparkline} sparklineLabel="Devices" />,
      { wrapper },
    );
    const chip = screen.getByTestId('kpi-tile-sparkline');
    expect(chip).toHaveAttribute('data-trend', 'up');
    expect(screen.getByTestId('tp-sparkline')).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Devices 7-day trend (up)'),
    );
  });

  it('does not render the chip when series is empty', () => {
    render(
      <KpiTile
        title="Alerts"
        value={0}
        sparkline={{ trend: 'flat', series: [] }}
      />,
      { wrapper },
    );
    expect(screen.queryByTestId('kpi-tile-sparkline')).not.toBeInTheDocument();
  });

  it('does not render the chip while loading', () => {
    render(
      <KpiTile
        title="Devices"
        value={0}
        loading
        sparkline={{
          trend: 'flat',
          series: [{ t: '2026-05-25T00:00:00Z', v: 1 }],
        }}
      />,
      { wrapper },
    );
    expect(screen.queryByTestId('kpi-tile-sparkline')).not.toBeInTheDocument();
  });
});
