import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TpAreaChart } from '@/components/charts/TpAreaChart';
import * as chartExport from '@/lib/chartExport';

vi.mock('@/theme/ThemeProvider', () => ({
  useThemeMode: () => ({ mode: 'light' as const, setMode: vi.fn() }),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="rc-responsive">{children}</div>
  ),
  AreaChart: ({ children, syncId }: { children: React.ReactNode; syncId?: string }) => (
    <svg data-testid="rc-svg" data-syncid={syncId ?? ''}>{children}</svg>
  ),
  Area: ({ name, stackId }: { name?: string; stackId?: string }) => (
    <g data-testid={`rc-area-${name}`} data-stackid={stackId ?? ''} />
  ),
  XAxis: () => <g />,
  YAxis: () => <g />,
  CartesianGrid: () => <g />,
  Tooltip: () => <g />,
  ReferenceLine: ({
    x,
    y,
    stroke,
    label,
    'data-testid': testId,
  }: {
    x?: number | string;
    y?: number | string;
    stroke?: string;
    label?: { value?: string } | string;
    'data-testid'?: string;
  }) => {
    const labelText = typeof label === 'object' ? label?.value : label;
    return (
      <g
        data-testid={testId ?? 'rc-ref-line'}
        data-axis={x !== undefined ? 'x' : 'y'}
        data-value={String(x ?? y ?? '')}
        data-stroke={stroke ?? ''}
        data-label={labelText ?? ''}
      />
    );
  },
  Brush: ({ dataKey, 'data-testid': testId }: { dataKey?: string; 'data-testid'?: string }) => (
    <g data-testid={testId ?? 'rc-brush'} data-datakey={dataKey ?? ''} />
  ),
}));

const SERIES_3 = [
  { key: 'a', label: 'Alpha' },
  { key: 'b', label: 'Beta' },
  { key: 'c', label: 'Gamma' },
];

const SERIES_10 = Array.from({ length: 10 }, (_, i) => ({
  key: `s${i}`,
  label: `Series ${i}`,
}));

function makeData(n: number, keys: string[]) {
  const base = new Date('2026-04-25T10:00:00Z').getTime();
  return Array.from({ length: n }, (_, i) => {
    const row: Record<string, unknown> = {
      t: new Date(base + i * 60000).toISOString(),
    };
    for (const k of keys) row[k] = i;
    return row;
  });
}

describe('TpAreaChart', () => {
  it('renders the chart with default (overlay) summary and tz badge', () => {
    render(
      <TpAreaChart
        data={makeData(3, ['a', 'b'])}
        series={[{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }]}
        xKey="t"
      />,
    );
    expect(screen.getByTestId('tp-area-chart')).toBeInTheDocument();
    expect(screen.getByTestId('tp-area-chart-summary')).toHaveTextContent(
      /^Area chart with 2 series across 3 data points/,
    );
    expect(screen.getByTestId('tp-area-chart-tz')).toBeInTheDocument();
    // overlay mode: no stackId
    expect(screen.getByTestId('rc-area-A').getAttribute('data-stackid')).toBe('');
  });

  it('uses "Stacked area chart" wording and stackId="1" when stacked', () => {
    render(
      <TpAreaChart
        data={makeData(3, ['a', 'b'])}
        series={[{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }]}
        xKey="t"
        stacked
      />,
    );
    expect(screen.getByTestId('tp-area-chart-summary')).toHaveTextContent(
      /^Stacked area chart with 2 series/,
    );
    expect(screen.getByTestId('rc-area-A').getAttribute('data-stackid')).toBe('1');
    expect(screen.getByTestId('rc-area-B').getAttribute('data-stackid')).toBe('1');
  });

  it('shows empty state when data is empty and not loading', () => {
    render(<TpAreaChart data={[]} series={SERIES_3} xKey="t" />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.queryByTestId('rc-svg')).not.toBeInTheDocument();
  });

  it('shows loading overlay when loading=true', () => {
    render(<TpAreaChart data={[]} series={SERIES_3} xKey="t" loading />);
    expect(screen.getByTestId('tp-area-chart-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });

  it('renders Alert for string error', () => {
    render(
      <TpAreaChart
        data={makeData(2, ['a'])}
        series={[{ key: 'a', label: 'A' }]}
        xKey="t"
        error="Boom"
      />,
    );
    expect(screen.getByTestId('tp-area-chart-error')).toHaveTextContent('Boom');
  });

  it('auto-enables the series filter when series.length > 8', () => {
    render(
      <TpAreaChart
        data={makeData(2, SERIES_10.map((s) => s.key))}
        series={SERIES_10}
        xKey="t"
      />,
    );
    expect(screen.getByTestId('tp-area-chart-series-filter')).toBeInTheDocument();
  });

  it('does not show series filter for small series count by default', () => {
    render(<TpAreaChart data={makeData(2, ['a'])} series={SERIES_3} xKey="t" />);
    expect(
      screen.queryByTestId('tp-area-chart-series-filter'),
    ).not.toBeInTheDocument();
  });

  it('fires CSV export when export button clicked', () => {
    const spy = vi.spyOn(chartExport, 'downloadCsv').mockImplementation(() => {});
    render(
      <TpAreaChart
        data={makeData(2, ['a'])}
        series={[{ key: 'a', label: 'A' }]}
        xKey="t"
        showExport
        exportFileName="usage"
      />,
    );
    fireEvent.click(screen.getByTestId('tp-area-chart-export-csv'));
    expect(spy).toHaveBeenCalledWith('usage.csv', expect.any(String));
    spy.mockRestore();
  });

  it('falls back ariaLabel to summary when not provided', () => {
    render(
      <TpAreaChart
        data={makeData(2, ['a'])}
        series={[{ key: 'a', label: 'A' }]}
        xKey="t"
      />,
    );
    const fig = screen.getByRole('img');
    expect(fig.getAttribute('aria-label')).toMatch(/^Area chart with 1 series/);
  });

  it('renders per-series gradient defs in overlay mode', () => {
    const { container } = render(
      <TpAreaChart
        data={makeData(3, ['a', 'b'])}
        series={[{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }]}
        xKey="t"
      />,
    );
    expect(container.querySelector('#tp-area-grad-a')).toBeInTheDocument();
    expect(container.querySelector('#tp-area-grad-b')).toBeInTheDocument();
  });

  it('omits per-series gradients in stacked mode (solid fill reads cleaner)', () => {
    const { container } = render(
      <TpAreaChart
        data={makeData(3, ['a', 'b'])}
        series={[{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }]}
        xKey="t"
        stacked
      />,
    );
    expect(container.querySelector('#tp-area-grad-a')).not.toBeInTheDocument();
    expect(container.querySelector('#tp-area-grad-b')).not.toBeInTheDocument();
  });

  // ---- Phase C interactivity follow-ups (syncId, referenceLines, enableBrush) ----

  it('passes syncId through for shared cursor sync with sibling charts', () => {
    render(
      <TpAreaChart
        data={makeData(2, ['a'])}
        series={[{ key: 'a', label: 'A' }]}
        xKey="t"
        syncId="asset-detail"
      />,
    );
    expect(screen.getByTestId('rc-svg')).toHaveAttribute('data-syncid', 'asset-detail');
  });

  it('renders reference lines coloured by severity', () => {
    render(
      <TpAreaChart
        data={makeData(2, ['a'])}
        series={[{ key: 'a', label: 'A' }]}
        xKey="t"
        referenceLines={[
          { value: 100, severity: 'danger', label: 'SLO' },
          { value: '2026-04-25T10:00:00Z', axis: 'x', severity: 'neutral' },
        ]}
      />,
    );
    const ref0 = screen.getByTestId('tp-area-chart-ref-0');
    const ref1 = screen.getByTestId('tp-area-chart-ref-1');
    expect(ref0).toHaveAttribute('data-axis', 'y');
    expect(ref0).toHaveAttribute('data-stroke', 'var(--color-danger)');
    expect(ref0).toHaveAttribute('data-label', 'SLO');
    expect(ref1).toHaveAttribute('data-axis', 'x');
    expect(ref1).toHaveAttribute('data-stroke', 'var(--color-text-muted)');
  });

  it('renders a Brush strip when enableBrush is true', () => {
    render(
      <TpAreaChart
        data={makeData(2, ['a'])}
        series={[{ key: 'a', label: 'A' }]}
        xKey="t"
        enableBrush
      />,
    );
    expect(screen.getByTestId('tp-area-chart-brush')).toHaveAttribute('data-datakey', 't');
  });
});
