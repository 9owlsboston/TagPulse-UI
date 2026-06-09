/**
 * <TpLineChart> — Sprint 57 Phase C.3 chart wrapper.
 *
 * Wraps Recharts <LineChart> behind a stable contract so the
 * underlying library can be swapped (e.g. uPlot, if the Phase C.6
 * perf spike at 50 series × 720 points fails the 60fps budget)
 * without touching consumers.
 *
 * Contract (per docs/sprint-57-telemetry-charting.md §C):
 *   - token-aware palette (theme.chartSeries fallback per series)
 *   - hierarchical X-axis formatter (date-only at day boundaries,
 *     time-only intra-day) + static (UTC±HH:MM) corner label
 *   - searchable virtualized series multi-select replaces bottom
 *     legend (with "+N more" overflow chip when some series hidden)
 *   - built-in loading / error / empty states (Spin / Alert /
 *     <EmptyState>) so consumers don't reimplement them
 *   - <figcaption>-style screen-reader summary + role="img" wrapper
 *   - export hook: ref-to-internal-SVG + downloadSvgAsPng /
 *     downloadCsv from src/lib/chartExport (showExport prop)
 */
import { useMemo, useRef, useState, useCallback } from 'react';
import Alert from 'antd/es/alert';
import Button from 'antd/es/button';
import Select from 'antd/es/select';
import Space from 'antd/es/space';
import Spin from 'antd/es/spin';
import { DownloadOutlined, FileImageOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EmptyState } from '@/components/EmptyState';
import {
  downloadCsv,
  downloadSvgAsPng,
  toCsv,
  type CsvColumn,
} from '@/lib/chartExport';
import { getTzLabel } from '@/components/TimeRangePicker.constants';
import { TpTooltip } from '@/components/charts/TpTooltip';
import { useThemeMode } from '@/theme/ThemeProvider';
import { tokens } from '@/theme/tokens';

export interface TpSeries {
  /** Field name on each row that holds this series' value. */
  key: string;
  /** Human label for legend / filter / a11y summary. */
  label: string;
  /** Override default token palette colour. */
  color?: string;
}

export interface TpLineChartProps<TRow extends Record<string, unknown>> {
  data: TRow[];
  series: TpSeries[];
  /** Row field for the X (time) axis — values must be ISO strings or numeric timestamps. */
  xKey: string;
  /** Chart height in px. Default 360. */
  height?: number;
  /** Y axis label rendered rotated on the left edge. */
  yLabel?: string;
  /** Async state — renders centered spinner over the chart area. */
  loading?: boolean;
  /** Error to surface as an inline Alert. Can be Error, string, or null. */
  error?: Error | string | null;
  /** role="img" aria-label for the figure as a whole. Falls back to summary. */
  ariaLabel?: string;
  /**
   * Override the auto-generated `<figcaption>` SR summary.
   * Default: "Line chart with N series across M data points from <start> to <end>."
   */
  summary?: string;
  /**
   * Show the top-of-chart searchable series multi-select.
   * Default: true when series.length > 8 (the threshold the original
   * `<Legend>` becomes unreadable at on a 1024px viewport).
   */
  enableSeriesFilter?: boolean;
  /** Initially selected series keys; default = all. */
  defaultSelectedKeys?: string[];
  /** Append .csv / .png to this name on export. Default 'chart'. */
  exportFileName?: string;
  /** Show CSV + PNG export buttons in the top-right corner. */
  showExport?: boolean;
  /** Override the auto-detected timezone corner badge. */
  tzLabel?: string;
}

/**
 * Format an ISO/numeric timestamp using a hierarchical tick strategy:
 *   - all data within a single calendar day → "HH:mm"
 *   - data spans multiple days → "MMM D HH:mm"
 *
 * We pre-compute the strategy outside the formatter (which Recharts
 * calls per tick) so we don't re-walk the dataset N times per render.
 */
function chooseTickFormatter(values: ReadonlyArray<number>): (v: unknown) => string {
  if (values.length === 0) return (v) => String(v);
  const first = dayjs(values[0]);
  const last = dayjs(values[values.length - 1]);
  const sameDay = first.isSame(last, 'day');
  return (v: unknown) => {
    const d = dayjs(v as string | number);
    if (!d.isValid()) return String(v);
    return sameDay ? d.format('HH:mm') : d.format('MMM D HH:mm');
  };
}

function defaultSummary(
  series: TpSeries[],
  data: ReadonlyArray<Record<string, unknown>>,
  xKey: string,
): string {
  if (data.length === 0) {
    return `Line chart with ${series.length} series, no data points.`;
  }
  const first = dayjs(data[0]?.[xKey] as string | number);
  const last = dayjs(data[data.length - 1]?.[xKey] as string | number);
  const range =
    first.isValid() && last.isValid()
      ? ` from ${first.format('YYYY-MM-DD HH:mm')} to ${last.format('YYYY-MM-DD HH:mm')}`
      : '';
  return `Line chart with ${series.length} series across ${data.length} data points${range}.`;
}

const SR_ONLY: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export function TpLineChart<TRow extends Record<string, unknown>>({
  data,
  series,
  xKey,
  height = 360,
  yLabel,
  loading,
  error,
  ariaLabel,
  summary,
  enableSeriesFilter,
  defaultSelectedKeys,
  exportFileName = 'chart',
  showExport,
  tzLabel,
}: TpLineChartProps<TRow>) {
  const { mode } = useThemeMode();
  const palette = tokens[mode].chartSeries;

  const filterEnabled = enableSeriesFilter ?? series.length > 8;
  const allKeys = useMemo(() => series.map((s) => s.key), [series]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(
    defaultSelectedKeys ?? allKeys,
  );

  const visibleSeries = useMemo(
    () => series.filter((s) => selectedKeys.includes(s.key)),
    [series, selectedKeys],
  );
  const hiddenCount = series.length - visibleSeries.length;

  const colorFor = useCallback(
    (s: TpSeries, idx: number) => s.color ?? palette[idx % palette.length],
    [palette],
  );

  // X-axis tick formatter — choose once per data change.
  const xValues = useMemo(
    () => data.map((row) => {
      const raw = row[xKey];
      return typeof raw === 'number' ? raw : dayjs(raw as string).valueOf();
    }),
    [data, xKey],
  );
  const tickFormatter = useMemo(() => chooseTickFormatter(xValues), [xValues]);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleExportPng = useCallback(async () => {
    const svg = containerRef.current?.querySelector('svg');
    if (!svg) return;
    await downloadSvgAsPng(svg as unknown as SVGSVGElement, `${exportFileName}.png`);
  }, [exportFileName]);

  const handleExportCsv = useCallback(() => {
    const columns: CsvColumn<TRow>[] = [
      { header: xKey, accessor: (row) => row[xKey] },
      ...series.map<CsvColumn<TRow>>((s) => ({
        header: s.label,
        accessor: (row) => row[s.key],
      })),
    ];
    downloadCsv(`${exportFileName}.csv`, toCsv(data, columns));
  }, [data, series, xKey, exportFileName]);

  const captionText = summary ?? defaultSummary(series, data, xKey);
  const resolvedTz = tzLabel ?? getTzLabel();
  const resolvedAriaLabel = ariaLabel ?? captionText;

  const isEmpty = !loading && !error && data.length === 0;

  return (
    <div
      data-testid="tp-line-chart"
      style={{ position: 'relative', width: '100%' }}
    >
      {/* Top bar — series filter (when enabled) + export buttons */}
      {(filterEnabled || showExport) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          {filterEnabled ? (
            <Space size="small" align="center">
              <Select
                mode="multiple"
                value={selectedKeys}
                onChange={setSelectedKeys}
                options={series.map((s) => ({ label: s.label, value: s.key }))}
                style={{ minWidth: 280, maxWidth: 480 }}
                placeholder="Filter series"
                maxTagCount="responsive"
                data-testid="tp-line-chart-series-filter"
                showSearch
                optionFilterProp="label"
                virtual
                allowClear
                aria-label="Filter chart series"
              />
              {hiddenCount > 0 && (
                <span
                  data-testid="tp-line-chart-hidden-count"
                  style={{ color: 'var(--color-text-muted)', fontSize: 12 }}
                >
                  +{hiddenCount} hidden
                </span>
              )}
            </Space>
          ) : (
            <span />
          )}
          {showExport && (
            <Space size="small">
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={handleExportCsv}
                data-testid="tp-line-chart-export-csv"
              >
                CSV
              </Button>
              <Button
                size="small"
                icon={<FileImageOutlined />}
                onClick={handleExportPng}
                data-testid="tp-line-chart-export-png"
              >
                PNG
              </Button>
            </Space>
          )}
        </div>
      )}

      {/* Error banner — non-blocking */}
      {error && (
        <Alert
          data-testid="tp-line-chart-error"
          type="error"
          showIcon
          message={typeof error === 'string' ? error : error.message}
          style={{ marginBottom: 8 }}
        />
      )}

      {/* Chart container — also the PNG export source */}
      <div
        ref={containerRef}
        role="img"
        aria-label={resolvedAriaLabel}
        style={{ position: 'relative', width: '100%', height }}
      >
        {/* SR-only summary (figcaption-style) */}
        <span data-testid="tp-line-chart-summary" style={SR_ONLY}>
          {captionText}
        </span>

        {isEmpty ? (
          <EmptyState title="No data" description="No points in the selected range." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 24, left: 16, bottom: 8 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                strokeOpacity={0.4}
              />
              <XAxis
                dataKey={xKey}
                tickFormatter={tickFormatter}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                label={
                  yLabel
                    ? {
                        value: yLabel,
                        angle: -90,
                        position: 'insideLeft',
                        offset: 0,
                        style: { textAnchor: 'middle' },
                      }
                    : undefined
                }
              />
              <Tooltip
                content={<TpTooltip labelFormatter={(label) => tickFormatter(label)} />}
                cursor={{ stroke: 'var(--color-accent)', strokeWidth: 1, strokeOpacity: 0.5 }}
              />
              {visibleSeries.map((s) => {
                const idx = series.findIndex((x) => x.key === s.key);
                return (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={colorFor(s, idx)}
                    dot={false}
                    isAnimationActive={!loading}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* Timezone corner badge */}
        <span
          data-testid="tp-line-chart-tz"
          style={{
            position: 'absolute',
            right: 8,
            bottom: 8,
            color: 'var(--color-text-muted)',
            fontSize: 12,
            pointerEvents: 'none',
          }}
        >
          {resolvedTz}
        </span>

        {/* Loading overlay */}
        {loading && (
          <div
            data-testid="tp-line-chart-loading"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--color-surface)',
              opacity: 0.6,
            }}
          >
            <Spin />
          </div>
        )}
      </div>
    </div>
  );
}
