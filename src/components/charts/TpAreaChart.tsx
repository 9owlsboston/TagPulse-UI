/**
 * <TpAreaChart> — Sprint 57 Phase C.4 stacked/filled chart wrapper.
 *
 * Same contract shape as <TpLineChart> so a consumer can switch
 * presentation by swapping the import — useful when the visual
 * intent is cumulative magnitude (token-issuance, usage breakdown)
 * rather than per-series comparison.
 *
 * Adds one prop on top of TpLineChart's contract:
 *   - `stacked` (default false): when true, areas stack vertically
 *     using Recharts' `stackId="1"` convention.
 *
 * Everything else — palette, hierarchical X formatter, series
 * filter at >8 series, export buttons, SR summary, role="img",
 * loading/error/empty states, tz badge — mirrors TpLineChart.
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
  Area,
  AreaChart,
  CartesianGrid,
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
import { useThemeMode } from '@/theme/ThemeProvider';
import { tokens } from '@/theme/tokens';
import type { TpSeries } from '@/components/charts/TpLineChart';

export type { TpSeries };

export interface TpAreaChartProps<TRow extends Record<string, unknown>> {
  data: TRow[];
  series: TpSeries[];
  xKey: string;
  /** Chart height in px. Default 360. */
  height?: number;
  yLabel?: string;
  loading?: boolean;
  error?: Error | string | null;
  ariaLabel?: string;
  summary?: string;
  /** Stack areas (cumulative) instead of overlaying. Default false. */
  stacked?: boolean;
  /** Default true when series.length > 8. */
  enableSeriesFilter?: boolean;
  defaultSelectedKeys?: string[];
  exportFileName?: string;
  showExport?: boolean;
  tzLabel?: string;
}

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
  stacked: boolean,
): string {
  const kind = stacked ? 'Stacked area chart' : 'Area chart';
  if (data.length === 0) {
    return `${kind} with ${series.length} series, no data points.`;
  }
  const first = dayjs(data[0]?.[xKey] as string | number);
  const last = dayjs(data[data.length - 1]?.[xKey] as string | number);
  const range =
    first.isValid() && last.isValid()
      ? ` from ${first.format('YYYY-MM-DD HH:mm')} to ${last.format('YYYY-MM-DD HH:mm')}`
      : '';
  return `${kind} with ${series.length} series across ${data.length} data points${range}.`;
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

export function TpAreaChart<TRow extends Record<string, unknown>>({
  data,
  series,
  xKey,
  height = 360,
  yLabel,
  loading,
  error,
  ariaLabel,
  summary,
  stacked = false,
  enableSeriesFilter,
  defaultSelectedKeys,
  exportFileName = 'chart',
  showExport,
  tzLabel,
}: TpAreaChartProps<TRow>) {
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

  const xValues = useMemo(
    () =>
      data.map((row) => {
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

  const captionText = summary ?? defaultSummary(series, data, xKey, stacked);
  const resolvedTz = tzLabel ?? getTzLabel();
  const resolvedAriaLabel = ariaLabel ?? captionText;

  const isEmpty = !loading && !error && data.length === 0;

  return (
    <div
      data-testid="tp-area-chart"
      style={{ position: 'relative', width: '100%' }}
    >
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
                data-testid="tp-area-chart-series-filter"
                showSearch
                optionFilterProp="label"
                virtual
                allowClear
                aria-label="Filter chart series"
              />
              {hiddenCount > 0 && (
                <span
                  data-testid="tp-area-chart-hidden-count"
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
                data-testid="tp-area-chart-export-csv"
              >
                CSV
              </Button>
              <Button
                size="small"
                icon={<FileImageOutlined />}
                onClick={handleExportPng}
                data-testid="tp-area-chart-export-png"
              >
                PNG
              </Button>
            </Space>
          )}
        </div>
      )}

      {error && (
        <Alert
          data-testid="tp-area-chart-error"
          type="error"
          showIcon
          message={typeof error === 'string' ? error : error.message}
          style={{ marginBottom: 8 }}
        />
      )}

      <div
        ref={containerRef}
        role="img"
        aria-label={resolvedAriaLabel}
        style={{ position: 'relative', width: '100%', height }}
      >
        <span data-testid="tp-area-chart-summary" style={SR_ONLY}>
          {captionText}
        </span>

        {isEmpty ? (
          <EmptyState title="No data" description="No points in the selected range." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 24, left: 16, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xKey} tickFormatter={tickFormatter} />
              <YAxis
                allowDecimals={false}
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
              <Tooltip labelFormatter={(label) => tickFormatter(label)} />
              {visibleSeries.map((s) => {
                const idx = series.findIndex((x) => x.key === s.key);
                const c = colorFor(s, idx);
                return (
                  <Area
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={c}
                    fill={c}
                    fillOpacity={stacked ? 0.65 : 0.25}
                    stackId={stacked ? '1' : undefined}
                    isAnimationActive={!loading}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        )}

        <span
          data-testid="tp-area-chart-tz"
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

        {loading && (
          <div
            data-testid="tp-area-chart-loading"
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
