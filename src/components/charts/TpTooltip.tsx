/**
 * <TpTooltip> — Sprint 58 token-aware Recharts tooltip.
 *
 * Plugged into <TpLineChart> and <TpAreaChart> as
 * `<Tooltip content={<TpTooltip labelFormatter={...} />} />`. Replaces
 * Recharts' default white panel (which ignores our design tokens and
 * looks foreign in dark mode) with a card themed by the same CSS
 * custom properties as the rest of the SPA chrome:
 *
 *   - background: var(--color-surface-raised)
 *   - border:     1px solid var(--color-border)
 *   - timestamp:  muted (var(--color-text-muted))
 *   - value rows: bold in var(--color-text), prefixed by the series'
 *                 stroke colour swatch
 *
 * No props on the wrapper consumer side — TpLineChart / TpAreaChart
 * own the `<Tooltip>` instance and pass the chart's `tickFormatter`
 * down so the label header reads "May 24 14:30" instead of the raw
 * ISO string Recharts ships by default.
 */
import type { CSSProperties, ReactNode } from 'react';

export interface TpTooltipPayloadItem {
  name?: string | number;
  value?: number | string | Array<number | string> | null;
  color?: string;
  stroke?: string;
  fill?: string;
  dataKey?: string | number;
}

export interface TpTooltipProps {
  active?: boolean;
  payload?: TpTooltipPayloadItem[];
  label?: string | number;
  labelFormatter?: (label: unknown) => string;
}

const PANEL: CSSProperties = {
  background: 'var(--color-surface-raised)',
  border: '1px solid var(--color-border)',
  borderRadius: 6,
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
  padding: '8px 12px',
  minWidth: 140,
  fontSize: 12,
  color: 'var(--color-text)',
  // ensure the tooltip floats above the chart series strokes
  pointerEvents: 'none',
};

const LABEL_STYLE: CSSProperties = {
  color: 'var(--color-text-muted)',
  fontSize: 11,
  marginBottom: 6,
  fontWeight: 500,
};

const ROW: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  lineHeight: 1.4,
};

const SWATCH: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: 2,
  flex: '0 0 8px',
};

const NAME: CSSProperties = {
  color: 'var(--color-text-muted)',
  flex: '1 1 auto',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const VALUE: CSSProperties = {
  fontWeight: 600,
  color: 'var(--color-text)',
  fontVariantNumeric: 'tabular-nums',
};

function renderValue(v: TpTooltipPayloadItem['value']): ReactNode {
  if (v == null) return '—';
  if (Array.isArray(v)) return v.map((x) => String(x)).join(' – ');
  if (typeof v === 'number') {
    // numeric formatting kept light — caller decides units; we just
    // group thousands for readability on big numbers.
    return v.toLocaleString();
  }
  return String(v);
}

export function TpTooltip({
  active,
  payload,
  label,
  labelFormatter,
}: TpTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const headerText =
    labelFormatter && label !== undefined ? labelFormatter(label) : String(label ?? '');

  return (
    <div data-testid="tp-tooltip" role="tooltip" style={PANEL}>
      {headerText && (
        <div data-testid="tp-tooltip-label" style={LABEL_STYLE}>
          {headerText}
        </div>
      )}
      {payload.map((item, idx) => {
        const swatchColor = item.color ?? item.stroke ?? item.fill ?? 'var(--color-accent)';
        const name = item.name ?? item.dataKey ?? '';
        return (
          <div
            key={`${String(item.dataKey ?? name)}-${idx}`}
            data-testid="tp-tooltip-row"
            style={ROW}
          >
            <span aria-hidden="true" style={{ ...SWATCH, background: swatchColor }} />
            <span style={NAME}>{String(name)}</span>
            <span style={VALUE}>{renderValue(item.value)}</span>
          </div>
        );
      })}
    </div>
  );
}
