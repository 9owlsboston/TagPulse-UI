import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TpLineChart } from '@/components/charts/TpLineChart';
import * as chartExport from '@/lib/chartExport';

vi.mock('@/theme/ThemeProvider', () => ({
  useThemeMode: () => ({ mode: 'light' as const, setMode: vi.fn() }),
}));

// Recharts is heavy — render dummy DOM so the wrapper's chrome
// (filter bar, exports, tz badge, summary, empty state) is what we
// actually assert on.
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="rc-responsive">{children}</div>
  ),
  LineChart: ({ children, syncId }: { children: React.ReactNode; syncId?: string }) => (
    <svg data-testid="rc-svg" data-syncid={syncId ?? ''}>{children}</svg>
  ),
  Line: ({ name }: { name?: string }) => (
    <g data-testid={`rc-line-${name}`} />
  ),
  XAxis: () => <g />,
  YAxis: () => <g />,
  CartesianGrid: () => <g />,
  Tooltip: () => <g />,
  Legend: () => <g />,
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
    const row: Record<string, unknown> = { t: new Date(base + i * 60000).toISOString() };
    for (const k of keys) row[k] = i;
    return row;
  });
}

describe('TpLineChart', () => {
  it('renders the chart with figcaption-style summary and tz badge', () => {
    render(
      <TpLineChart
        data={makeData(3, ['a', 'b'])}
        series={[{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }]}
        xKey="t"
      />,
    );
    expect(screen.getByTestId('tp-line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('tp-line-chart-summary')).toHaveTextContent(
      /Line chart with 2 series across 3 data points/,
    );
    expect(screen.getByTestId('tp-line-chart-tz')).toBeInTheDocument();
  });

  it('shows the empty state when data is empty and not loading', () => {
    render(
      <TpLineChart data={[]} series={SERIES_3} xKey="t" />,
    );
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.queryByTestId('rc-svg')).not.toBeInTheDocument();
  });

  it('shows the loading overlay when loading=true', () => {
    render(
      <TpLineChart data={[]} series={SERIES_3} xKey="t" loading />,
    );
    expect(screen.getByTestId('tp-line-chart-loading')).toBeInTheDocument();
    // Empty state is suppressed while loading.
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });

  it('renders an Alert for string error', () => {
    render(
      <TpLineChart
        data={makeData(2, ['a'])}
        series={[{ key: 'a', label: 'A' }]}
        xKey="t"
        error="Something broke"
      />,
    );
    expect(screen.getByTestId('tp-line-chart-error')).toHaveTextContent('Something broke');
  });

  it('renders an Alert for Error instance', () => {
    render(
      <TpLineChart
        data={makeData(2, ['a'])}
        series={[{ key: 'a', label: 'A' }]}
        xKey="t"
        error={new Error('boom')}
      />,
    );
    expect(screen.getByTestId('tp-line-chart-error')).toHaveTextContent('boom');
  });

  it('hides series filter by default below the 8-series threshold', () => {
    render(
      <TpLineChart data={makeData(2, ['a', 'b', 'c'])} series={SERIES_3} xKey="t" />,
    );
    expect(screen.queryByTestId('tp-line-chart-series-filter')).not.toBeInTheDocument();
  });

  it('auto-enables series filter when more than 8 series', () => {
    const keys = SERIES_10.map((s) => s.key);
    render(
      <TpLineChart data={makeData(2, keys)} series={SERIES_10} xKey="t" />,
    );
    expect(screen.getByTestId('tp-line-chart-series-filter')).toBeInTheDocument();
  });

  it('respects explicit enableSeriesFilter=true', () => {
    render(
      <TpLineChart
        data={makeData(2, ['a'])}
        series={[{ key: 'a', label: 'A' }]}
        xKey="t"
        enableSeriesFilter
      />,
    );
    expect(screen.getByTestId('tp-line-chart-series-filter')).toBeInTheDocument();
  });

  it('only renders selected series via defaultSelectedKeys', () => {
    render(
      <TpLineChart
        data={makeData(2, ['a', 'b', 'c'])}
        series={SERIES_3}
        xKey="t"
        enableSeriesFilter
        defaultSelectedKeys={['a']}
      />,
    );
    expect(screen.getByTestId('rc-line-Alpha')).toBeInTheDocument();
    expect(screen.queryByTestId('rc-line-Beta')).not.toBeInTheDocument();
    expect(screen.queryByTestId('rc-line-Gamma')).not.toBeInTheDocument();
    expect(screen.getByTestId('tp-line-chart-hidden-count')).toHaveTextContent('+2 hidden');
  });

  it('renders export buttons when showExport is true', () => {
    render(
      <TpLineChart
        data={makeData(2, ['a'])}
        series={[{ key: 'a', label: 'A' }]}
        xKey="t"
        showExport
      />,
    );
    expect(screen.getByTestId('tp-line-chart-export-csv')).toBeInTheDocument();
    expect(screen.getByTestId('tp-line-chart-export-png')).toBeInTheDocument();
  });

  it('wires CSV export through chartExport.downloadCsv', () => {
    const spy = vi.spyOn(chartExport, 'downloadCsv').mockImplementation(() => {});
    render(
      <TpLineChart
        data={makeData(2, ['a'])}
        series={[{ key: 'a', label: 'A' }]}
        xKey="t"
        showExport
        exportFileName="my-chart"
      />,
    );
    fireEvent.click(screen.getByTestId('tp-line-chart-export-csv'));
    expect(spy).toHaveBeenCalledWith('my-chart.csv', expect.stringContaining('A'));
    spy.mockRestore();
  });

  it('uses ariaLabel for the role="img" container when provided', () => {
    render(
      <TpLineChart
        data={makeData(1, ['a'])}
        series={[{ key: 'a', label: 'A' }]}
        xKey="t"
        ariaLabel="Reads per device"
      />,
    );
    expect(screen.getByRole('img', { name: 'Reads per device' })).toBeInTheDocument();
  });

  it('falls back to summary text for the aria-label when no ariaLabel given', () => {
    render(
      <TpLineChart
        data={makeData(1, ['a'])}
        series={[{ key: 'a', label: 'A' }]}
        xKey="t"
      />,
    );
    expect(screen.getByRole('img', { name: /Line chart with 1 series/ })).toBeInTheDocument();
  });

  // ---- Phase C interactivity follow-ups (syncId, referenceLines, enableBrush) ----

  it('passes syncId through to the underlying chart for shared cursor sync', () => {
    render(
      <TpLineChart
        data={makeData(2, ['a'])}
        series={[{ key: 'a', label: 'A' }]}
        xKey="t"
        syncId="telemetry-dashboard"
      />,
    );
    expect(screen.getByTestId('rc-svg')).toHaveAttribute('data-syncid', 'telemetry-dashboard');
  });

  it('omits syncId attribute when prop is not set (chart stays independent)', () => {
    render(
      <TpLineChart
        data={makeData(2, ['a'])}
        series={[{ key: 'a', label: 'A' }]}
        xKey="t"
      />,
    );
    expect(screen.getByTestId('rc-svg')).toHaveAttribute('data-syncid', '');
  });

  it('renders one reference line per entry in referenceLines, with severity-coloured stroke', () => {
    render(
      <TpLineChart
        data={makeData(2, ['a'])}
        series={[{ key: 'a', label: 'A' }]}
        xKey="t"
        referenceLines={[
          { value: 80, severity: 'danger', label: 'Hot' },
          { value: 60, severity: 'warning' },
          { value: 40 }, // defaults to neutral, no label
        ]}
      />,
    );
    const danger = screen.getByTestId('tp-line-chart-ref-0');
    const warn = screen.getByTestId('tp-line-chart-ref-1');
    const neutral = screen.getByTestId('tp-line-chart-ref-2');
    expect(danger).toHaveAttribute('data-axis', 'y');
    expect(danger).toHaveAttribute('data-value', '80');
    expect(danger).toHaveAttribute('data-stroke', 'var(--color-danger)');
    expect(danger).toHaveAttribute('data-label', 'Hot');
    expect(warn).toHaveAttribute('data-stroke', 'var(--color-warning)');
    expect(neutral).toHaveAttribute('data-stroke', 'var(--color-text-muted)');
    expect(neutral).toHaveAttribute('data-label', '');
  });

  it('supports axis: "x" reference lines for timestamp annotations', () => {
    render(
      <TpLineChart
        data={makeData(2, ['a'])}
        series={[{ key: 'a', label: 'A' }]}
        xKey="t"
        referenceLines={[
          { value: '2026-04-25T10:00:00Z', axis: 'x', severity: 'warning', label: 'Deploy' },
        ]}
      />,
    );
    const ref = screen.getByTestId('tp-line-chart-ref-0');
    expect(ref).toHaveAttribute('data-axis', 'x');
    // x-axis is a numeric time scale, so the ISO ref value is coerced to epoch ms.
    expect(ref).toHaveAttribute('data-value', String(Date.parse('2026-04-25T10:00:00Z')));
    expect(ref).toHaveAttribute('data-label', 'Deploy');
  });

  it('renders no reference lines when prop is omitted', () => {
    render(
      <TpLineChart
        data={makeData(2, ['a'])}
        series={[{ key: 'a', label: 'A' }]}
        xKey="t"
      />,
    );
    expect(screen.queryByTestId('tp-line-chart-ref-0')).not.toBeInTheDocument();
  });

  it('renders a Brush strip when enableBrush is true', () => {
    render(
      <TpLineChart
        data={makeData(2, ['a'])}
        series={[{ key: 'a', label: 'A' }]}
        xKey="t"
        enableBrush
      />,
    );
    const brush = screen.getByTestId('tp-line-chart-brush');
    expect(brush).toBeInTheDocument();
    expect(brush).toHaveAttribute('data-datakey', '__tpTime');
  });

  it('omits the Brush strip by default', () => {
    render(
      <TpLineChart
        data={makeData(2, ['a'])}
        series={[{ key: 'a', label: 'A' }]}
        xKey="t"
      />,
    );
    expect(screen.queryByTestId('tp-line-chart-brush')).not.toBeInTheDocument();
  });
});
