/**
 * Sprint 57 Phase C.5 — axe-core a11y assertions for the chart wrappers.
 *
 * Recharts is mocked at module scope (same pattern used in every other
 * chart test) so axe runs against the wrapper *chrome* — the part the
 * Phase C contract owns: role=img container, SR-only summary, error
 * Alert, EmptyState, loading overlay, series filter, export buttons,
 * tz badge. The real SVG is replaced by a `<svg data-testid="rc-svg">`
 * stub which is enough for axe to verify roles/aria/contrast.
 */
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { TpLineChart } from '@/components/charts/TpLineChart';
import { TpAreaChart } from '@/components/charts/TpAreaChart';
import { TpSparkline } from '@/components/charts/TpSparkline';

expect.extend(toHaveNoViolations);

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

function makeData(n: number, keys: string[]) {
  const base = new Date('2026-04-25T09:00:00Z').getTime();
  return Array.from({ length: n }, (_, i) => {
    const row: Record<string, unknown> = {
      t: new Date(base + i * 60_000).toISOString(),
    };
    for (const k of keys) row[k] = i;
    return row;
  });
}

const FEW = [
  { key: 'a', label: 'Alpha' },
  { key: 'b', label: 'Beta' },
];

const MANY = Array.from({ length: 10 }, (_, i) => ({
  key: `s${i}`,
  label: `Series ${i + 1}`,
}));

describe('chart wrappers — axe a11y', () => {
  it('<TpLineChart> default render has no violations', async () => {
    const { container } = render(
      <TpLineChart data={makeData(5, ['a', 'b'])} series={FEW} xKey="t" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('<TpLineChart> empty state has no violations', async () => {
    const { container } = render(<TpLineChart data={[]} series={FEW} xKey="t" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('<TpLineChart> error state has no violations', async () => {
    const { container } = render(
      <TpLineChart
        data={makeData(5, ['a', 'b'])}
        series={FEW}
        xKey="t"
        error="Service unreachable"
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('<TpLineChart> with series filter (>8 series) + export buttons has no violations', async () => {
    const { container } = render(
      <TpLineChart
        data={makeData(5, MANY.map((s) => s.key))}
        series={MANY}
        xKey="t"
        showExport
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('<TpAreaChart> overlay default render has no violations', async () => {
    const { container } = render(
      <TpAreaChart data={makeData(5, ['a', 'b'])} series={FEW} xKey="t" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('<TpAreaChart> stacked has no violations', async () => {
    const { container } = render(
      <TpAreaChart data={makeData(5, ['a', 'b'])} series={FEW} xKey="t" stacked />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('<TpSparkline> default render has no violations', async () => {
    const { container } = render(
      <TpSparkline data={makeData(20, ['v'])} dataKey="v" />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('<TpSparkline> empty data has no violations', async () => {
    const { container } = render(<TpSparkline data={[]} dataKey="v" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
