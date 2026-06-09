/**
 * /dev/charts — Sprint 57 Phase C.5 acceptance artifact.
 *
 * Showcases every chart wrapper (`<TpLineChart>`, `<TpAreaChart>`,
 * `<TpSparkline>`) across the states the C.3/C.4 contracts care about:
 * empty, loading, error, single-series, ≤8 series, >8 series (filter
 * auto-on), short range (HH:mm same-day) and long range (MMM D HH:mm),
 * overlay + stacked area, and a row of inline sparklines. Used as the
 * visual reference + manual-QA surface for the Phase C wrappers and as
 * the render harness for the axe-core a11y assertions in
 * `ChartsPlayground.test.tsx`.
 *
 * Not linked from the main nav. Reachable only at `/dev/charts`.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import Card from 'antd/es/card';
import Space from 'antd/es/space';
import Button from 'antd/es/button';
import Statistic from 'antd/es/statistic';
import Typography from 'antd/es/typography';
import { TpLineChart, type TpSeries, type TpReferenceLine } from '@/components/charts/TpLineChart';
import { TpAreaChart } from '@/components/charts/TpAreaChart';
import { TpSparkline } from '@/components/charts/TpSparkline';

const { Title, Paragraph } = Typography;

type Row = Record<string, string | number>;

function makeData(points: number, keys: string[], stepMinutes = 5, startISO?: string): Row[] {
  const base = startISO ? new Date(startISO).getTime() : Date.now() - points * stepMinutes * 60_000;
  return Array.from({ length: points }, (_, i) => {
    const row: Row = { t: new Date(base + i * stepMinutes * 60_000).toISOString() };
    for (const k of keys) {
      // Deterministic-ish wave per series so the chart looks plausible.
      const seed = k.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      row[k] = Math.round(50 + 40 * Math.sin((i + seed) / 6) + (seed % 7));
    }
    return row;
  });
}

const FEW_SERIES: TpSeries[] = [
  { key: 'a', label: 'Reader 01' },
  { key: 'b', label: 'Reader 02' },
  { key: 'c', label: 'Reader 03' },
];

const MANY_SERIES: TpSeries[] = Array.from({ length: 12 }, (_, i) => ({
  key: `r${i}`,
  label: `Reader ${String(i + 1).padStart(2, '0')}`,
}));

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card data-testid={`playground-section-${id}`} title={title} style={{ marginBottom: 16 }}>
      {description ? <Paragraph type="secondary">{description}</Paragraph> : null}
      {children}
    </Card>
  );
}

export function ChartsPlayground() {
  // Same-day short range → ticks render as HH:mm only.
  const shortData = useMemo(
    () => makeData(24, ['a', 'b', 'c'], 5, '2026-04-25T09:00:00Z'),
    [],
  );
  // Multi-day long range → ticks render as MMM D HH:mm.
  const longData = useMemo(
    () => makeData(40, ['a', 'b', 'c'], 60 * 6, '2026-04-20T00:00:00Z'),
    [],
  );
  const singleData = useMemo(
    () => makeData(30, ['v'], 5, '2026-04-25T08:00:00Z'),
    [],
  );
  const manyData = useMemo(
    () => makeData(20, MANY_SERIES.map((s) => s.key), 15, '2026-04-25T08:00:00Z'),
    [],
  );
  const sparkData = useMemo(
    () => makeData(48, ['v'], 30, '2026-04-23T00:00:00Z'),
    [],
  );

  return (
    <div data-testid="charts-playground" style={{ padding: 16, maxWidth: 1200 }}>
      <Title level={2}>Chart Wrappers — Playground</Title>
      <Paragraph type="secondary">
        Visual reference for <code>&lt;TpLineChart&gt;</code>, <code>&lt;TpAreaChart&gt;</code>,
        and <code>&lt;TpSparkline&gt;</code>. Used as the harness for axe-core a11y assertions
        and as a manual-QA surface for the Phase C wrappers.
      </Paragraph>

      <Section
        id="line-single"
        title="<TpLineChart> — single series, short range"
        description="One series, 24 points 5 minutes apart. X-axis ticks render as HH:mm."
      >
        <TpLineChart
          data={singleData}
          series={[{ key: 'v', label: 'Reads / min' }]}
          xKey="t"
          height={280}
          showExport
          exportFileName="reads-per-min"
          ariaLabel="Reads per minute over the last two hours"
        />
      </Section>

      <Section
        id="line-few"
        title="<TpLineChart> — 3 series, long range"
        description="Multi-day window; ticks render as MMM D HH:mm. No filter (≤8 series)."
      >
        <TpLineChart
          data={longData}
          series={FEW_SERIES}
          xKey="t"
          height={280}
          showExport
          exportFileName="readers-week"
        />
      </Section>

      <Section
        id="line-many"
        title="<TpLineChart> — 12 series (series filter auto-on)"
        description="More than 8 series → top-of-chart multi-select filter renders automatically."
      >
        <TpLineChart
          data={manyData}
          series={MANY_SERIES}
          xKey="t"
          height={320}
          showExport
          exportFileName="readers-fleet"
        />
      </Section>

      <Section id="line-empty" title="<TpLineChart> — empty">
        <TpLineChart data={[]} series={FEW_SERIES} xKey="t" height={220} />
      </Section>

      <Section id="line-loading" title="<TpLineChart> — loading">
        <TpLineChart data={[]} series={FEW_SERIES} xKey="t" height={220} loading />
      </Section>

      <Section id="line-error" title="<TpLineChart> — error">
        <TpLineChart
          data={shortData}
          series={FEW_SERIES}
          xKey="t"
          height={220}
          error="Telemetry service is unreachable"
        />
      </Section>

      <Section
        id="area-overlay"
        title="<TpAreaChart> — overlay (stacked={false})"
        description="Each series renders as a translucent area at fillOpacity=0.25."
      >
        <TpAreaChart data={shortData} series={FEW_SERIES} xKey="t" height={280} showExport />
      </Section>

      <Section
        id="area-stacked"
        title="<TpAreaChart> — stacked"
        description="Stacked areas at fillOpacity=0.65; summary text switches to 'Stacked area chart'."
      >
        <TpAreaChart data={shortData} series={FEW_SERIES} xKey="t" height={280} showExport stacked />
      </Section>

      <Section
        id="sync-pair"
        title="<TpLineChart> — synced cursor (syncId)"
        description="Two charts that share syncId='playground-pair' — hover one and the other highlights the same timestamp. Use on dashboards where multiple panes share a time axis."
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <TpLineChart
            data={shortData}
            series={[{ key: 'a', label: 'Reader 01' }]}
            xKey="t"
            height={220}
            syncId="playground-pair"
            ariaLabel="Reader 01 reads (synced)"
          />
          <TpLineChart
            data={shortData}
            series={[{ key: 'b', label: 'Reader 02' }]}
            xKey="t"
            height={220}
            syncId="playground-pair"
            ariaLabel="Reader 02 reads (synced)"
          />
        </div>
      </Section>

      <Section
        id="reference-lines"
        title="<TpLineChart> — reference lines (thresholds + annotations)"
        description="Dashed horizontal lines for y-axis thresholds (severity → semantic token colour) plus a vertical x-axis marker for a deployment timestamp."
      >
        <TpLineChart
          data={shortData}
          series={FEW_SERIES}
          xKey="t"
          height={280}
          referenceLines={
            [
              { value: 85, severity: 'danger', label: 'Hot' },
              { value: 70, severity: 'warning', label: 'Warn' },
              { value: 30, severity: 'neutral', label: 'Floor' },
              { value: '2026-04-25T10:30:00Z', axis: 'x', severity: 'neutral', label: 'Deploy v1.4' },
            ] satisfies TpReferenceLine[]
          }
        />
      </Section>

      <Section
        id="brush-zoom"
        title="<TpLineChart> — brush zoom (enableBrush)"
        description="Drag the strip below the chart to narrow the visible domain. Used on Tag Reads (chart view) and the Telemetry Dashboard to inspect a slice without rebuilding URL state."
      >
        <TpLineChart
          data={longData}
          series={FEW_SERIES}
          xKey="t"
          height={280}
          enableBrush
        />
      </Section>

      <Section
        id="perf-spike"
        title="<TpLineChart> — perf spike (50 series × 720 points)"
        description="Sprint 57 §C.6 swap-trigger gate. Click 'Mount stress chart' then 'Run hover sweep' to measure FPS during a programmatic mousemove across the chart container. Target: ≥ 60 FPS average over a 3s sweep. If Recharts misses, swap to uPlot behind the unchanged TpLineChart contract."
      >
        <PerfHarness />
      </Section>

      <Section
        id="sparkline-row"
        title="<TpSparkline> — inline tile sparklines"
        description="No axes, legend, tooltip, or export. Just trend lines for dashboard tiles."
      >
        <Space size="large" wrap>
          {['Reader 01', 'Reader 02', 'Reader 03', 'Reader 04'].map((label) => (
            <div key={label} style={{ width: 160 }}>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{label}</div>
              <TpSparkline
                data={sparkData}
                dataKey="v"
                height={36}
                ariaLabel={`${label} trend, last 24 hours`}
              />
            </div>
          ))}
        </Space>
      </Section>
    </div>
  );
}

export default ChartsPlayground;

// ---------------------------------------------------------------------------
// Perf harness (§C.6 swap-trigger gate)
// ---------------------------------------------------------------------------

const PERF_SERIES_COUNT = 50;
const PERF_POINT_COUNT = 720;
const PERF_SWEEP_MS = 3000;

const PERF_SERIES: TpSeries[] = Array.from({ length: PERF_SERIES_COUNT }, (_, i) => ({
  key: `s${i}`,
  label: `Series ${String(i + 1).padStart(2, '0')}`,
}));

function PerfHarness() {
  const [mounted, setMounted] = useState(false);
  const [mountMs, setMountMs] = useState<number | null>(null);
  const [sweepResult, setSweepResult] = useState<{
    avgFps: number;
    minFps: number;
    frames: number;
    durationMs: number;
  } | null>(null);
  const [sweeping, setSweeping] = useState(false);
  const hostRef = useRef<HTMLDivElement | null>(null);

  const data = useMemo(
    () =>
      mounted
        ? makeData(
            PERF_POINT_COUNT,
            PERF_SERIES.map((s) => s.key),
            1,
            '2026-04-20T00:00:00Z',
          )
        : [],
    [mounted],
  );

  const handleMount = useCallback(() => {
    const t0 = performance.now();
    setMounted(true);
    // Capture mount-to-paint in a rAF chain.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setMountMs(performance.now() - t0);
      });
    });
  }, []);

  const handleSweep = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    setSweeping(true);
    setSweepResult(null);
    const rect = host.getBoundingClientRect();
    const startX = rect.left + 8;
    const endX = rect.right - 8;
    const y = rect.top + rect.height / 2;
    const t0 = performance.now();
    let frames = 0;
    let minFps = Infinity;
    let lastFrame = t0;
    const target = host.querySelector('svg') ?? host;
    const tick = (now: number) => {
      const elapsed = now - t0;
      const dt = now - lastFrame;
      if (dt > 0) minFps = Math.min(minFps, 1000 / dt);
      lastFrame = now;
      frames += 1;
      const progress = Math.min(1, elapsed / PERF_SWEEP_MS);
      const x = startX + (endX - startX) * progress;
      target.dispatchEvent(
        new MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true }),
      );
      if (elapsed < PERF_SWEEP_MS) {
        requestAnimationFrame(tick);
      } else {
        const durationMs = performance.now() - t0;
        setSweepResult({
          avgFps: (frames / durationMs) * 1000,
          minFps: Number.isFinite(minFps) ? minFps : 0,
          frames,
          durationMs,
        });
        setSweeping(false);
      }
    };
    requestAnimationFrame(tick);
  }, []);

  return (
    <div data-testid="perf-harness">
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" onClick={handleMount} disabled={mounted}>
          {mounted ? 'Mounted' : `Mount stress chart (${PERF_SERIES_COUNT}×${PERF_POINT_COUNT})`}
        </Button>
        <Button onClick={handleSweep} disabled={!mounted || sweeping}>
          {sweeping ? 'Sweeping…' : `Run hover sweep (${PERF_SWEEP_MS}ms)`}
        </Button>
      </Space>
      {mountMs !== null ? (
        <Space size="large" style={{ marginBottom: 12 }}>
          <Statistic title="Mount-to-paint" value={mountMs} precision={0} suffix="ms" />
          {sweepResult ? (
            <>
              <Statistic
                title="Avg FPS"
                value={sweepResult.avgFps}
                precision={1}
                valueStyle={{ color: sweepResult.avgFps >= 60 ? 'var(--color-success)' : 'var(--color-danger)' }}
              />
              <Statistic
                title="Min FPS"
                value={sweepResult.minFps}
                precision={1}
                valueStyle={{ color: sweepResult.minFps >= 30 ? 'var(--color-success)' : 'var(--color-danger)' }}
              />
              <Statistic title="Frames" value={sweepResult.frames} />
            </>
          ) : null}
        </Space>
      ) : null}
      <div ref={hostRef}>
        {mounted ? (
          <TpLineChart
            data={data}
            series={PERF_SERIES}
            xKey="t"
            height={360}
            ariaLabel="Perf spike: 50 series by 720 points"
            enableSeriesFilter={false}
          />
        ) : (
          <Paragraph type="secondary">
            Stress chart not mounted. Click the button above to render {PERF_SERIES_COUNT}{' '}
            series × {PERF_POINT_COUNT} points (≈{PERF_SERIES_COUNT * PERF_POINT_COUNT}{' '}
            data points).
          </Paragraph>
        )}
      </div>
    </div>
  );
}
