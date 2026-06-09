/**
 * <TpSparkline> — Sprint 57 Phase C.4 minimal chart wrapper.
 *
 * Companion to <TpLineChart> for small inline trend visuals on
 * dashboard tiles (Phase F). Intentionally has *no* chrome —
 * no axis labels, no legend, no tooltip, no series filter, no
 * export buttons, no timezone badge. Just a single coloured line
 * sized to fit a tile cell.
 *
 * Accessibility: still wraps the chart in role="img" with an
 * aria-label, plus an SR-only summary describing first/last/min/max
 * for screen-reader users.
 */
import { useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { useThemeMode } from '@/theme/ThemeProvider';
import { tokens } from '@/theme/tokens';

export interface TpSparklineProps<TRow extends Record<string, unknown>> {
  data: TRow[];
  /** Row field name holding the numeric value. */
  dataKey: string;
  /** Row field name for the X axis (used only for ordering — no ticks rendered). */
  xKey?: string;
  /** Pixel height. Default 40 — sized for a KPI tile row. */
  height?: number;
  /** Override the default first-token series colour. */
  color?: string;
  /** role="img" aria-label. Falls back to summary. */
  ariaLabel?: string;
  /** Override the auto-generated SR summary. */
  summary?: string;
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

function defaultSummary(
  data: ReadonlyArray<Record<string, unknown>>,
  dataKey: string,
): string {
  if (data.length === 0) return 'Sparkline with no data points.';
  const nums = data
    .map((r) => Number(r[dataKey]))
    .filter((n) => Number.isFinite(n));
  if (nums.length === 0) return `Sparkline of ${dataKey} with no numeric values.`;
  const first = nums[0];
  const last = nums[nums.length - 1];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return `Sparkline of ${dataKey} across ${nums.length} points; first ${first}, last ${last}, min ${min}, max ${max}.`;
}

export function TpSparkline<TRow extends Record<string, unknown>>({
  data,
  dataKey,
  xKey: _xKey,
  height = 40,
  color,
  ariaLabel,
  summary,
}: TpSparklineProps<TRow>) {
  const { mode } = useThemeMode();
  const stroke = color ?? tokens[mode].chartSeries[0];

  const captionText = useMemo(
    () => summary ?? defaultSummary(data, dataKey),
    [summary, data, dataKey],
  );
  const resolvedAriaLabel = ariaLabel ?? captionText;

  // Render a single 3px dot on the last data point so the tile reads
  // as "trend ending here" instead of trailing off into the gradient.
  // Returning an empty <g/> for every other index keeps the Recharts
  // `dot` contract happy (it expects an SVGElement, not null).
  const lastIndex = data.length - 1;
  const renderLastPointDot = (dotProps: {
    cx?: number;
    cy?: number;
    index?: number;
    key?: string | number;
  }) => {
    const { cx, cy, index, key } = dotProps;
    if (index !== lastIndex || cx == null || cy == null) {
      return <g key={key ?? `pt-${index}`} />;
    }
    return (
      <circle
        key={key ?? `pt-${index}`}
        data-testid="tp-sparkline-last-dot"
        cx={cx}
        cy={cy}
        r={3}
        fill={stroke}
        stroke="var(--color-surface)"
        strokeWidth={1}
      />
    );
  };

  return (
    <div
      data-testid="tp-sparkline"
      role="img"
      aria-label={resolvedAriaLabel}
      style={{ position: 'relative', width: '100%', height }}
    >
      <span data-testid="tp-sparkline-summary" style={SR_ONLY}>
        {captionText}
      </span>
      {data.length === 0 ? null : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            <defs>
              <linearGradient id={`sparkGrad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.25} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            {/* xKey is accepted for API symmetry with TpLineChart but
                only affects row ordering, which the caller controls. */}
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={stroke}
              strokeWidth={1.5}
              fill={`url(#sparkGrad-${dataKey})`}
              dot={renderLastPointDot}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
