import Card from 'antd/es/card';
import Statistic from 'antd/es/statistic';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { TpSparkline } from '@/components/charts/TpSparkline';
import type { SparklineSeries } from '@/types';

const ANIMATION_DURATION = 800; // ms for count-up animation
const FRAME_INTERVAL = 16; // ~60fps

function useAnimatedCounter(target: number): number {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    const from = prevRef.current;
    const to = target;
    prevRef.current = target;

    if (from === to) return;

    const diff = to - from;
    const steps = Math.max(1, Math.round(ANIMATION_DURATION / FRAME_INTERVAL));
    let step = 0;

    const timer = setInterval(() => {
      step++;
      if (step >= steps) {
        setDisplay(to);
        clearInterval(timer);
      } else {
        // Ease-out: fast start, slow finish
        const progress = 1 - Math.pow(1 - step / steps, 3);
        setDisplay(Math.round(from + diff * progress));
      }
    }, FRAME_INTERVAL);

    return () => clearInterval(timer);
  }, [target]);

  return display;
}

interface KpiTileProps {
  title: string;
  value: number | string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  loading?: boolean;
  /** Render hoverable + cursor:pointer when wrapped in a click target. */
  interactive?: boolean;
  /** Visually de-emphasize when hidden during dashboard customization. */
  dimmed?: boolean;
  /**
   * Sprint 57 Phase F — optional 7-day trend chip rendered under the value.
   * Omitted while the tile is loading or when the sparkline payload is
   * missing for this tile (graceful degradation per backend contract).
   */
  sparkline?: SparklineSeries;
  /** Accessible label prefix for the sparkline (e.g. tile title). */
  sparklineLabel?: string;
}

export function KpiTile({
  title,
  value,
  prefix,
  suffix,
  loading,
  interactive,
  dimmed,
  sparkline,
  sparklineLabel,
}: KpiTileProps) {
  const numericValue = typeof value === 'number' ? value : 0;
  const animated = useAnimatedCounter(numericValue);
  const displayValue = typeof value === 'number' ? animated : value;

  // Map {t,v}[] → rows the chart wrapper expects.
  const sparkRows = useMemo(
    () => (sparkline ? sparkline.series.map((p) => ({ t: p.t, v: p.v })) : []),
    [sparkline],
  );
  const showSparkline = !loading && sparkline !== undefined && sparkRows.length > 0;
  const sparkAriaLabel = sparklineLabel
    ? `${sparklineLabel} 7-day trend (${sparkline?.trend ?? 'flat'})`
    : undefined;

  return (
    <Card
      hoverable={interactive}
      // height:100% lets the card fill its grid <Col> so every tile in a row
      // reaches the same bottom edge — without this, AntD Cards hug their
      // content and short labels / shorter values produce uneven sparkline
      // baselines across the row.
      style={{ height: '100%', ...(dimmed ? { opacity: 0.45 } : null) }}
      styles={{
        body: {
          padding: '10px 14px',
          paddingBottom: showSparkline ? 0 : '10px',
          // Flex column so we can pin the sparkline to the bottom regardless
          // of how tall the header/value block ends up.
          display: 'flex',
          flexDirection: 'column',
          // Minimum vertical envelope picked to fit: title (~22px) + value
          // (28px * 1.2 ≈ 34px) + sparkline (28px) + ~16px of breathing room.
          // Tiles that wrap their label or render a taller icon will grow
          // beyond this, and AntD Row stretches the row so neighbours follow.
          minHeight: 108,
          height: '100%',
        },
      }}
    >
      <Statistic
        title={title}
        value={displayValue}
        prefix={prefix}
        suffix={suffix}
        loading={loading}
        valueStyle={{
          fontSize: 28,
          fontWeight: 700,
          color: 'var(--color-accent)',
          lineHeight: 1.2,
        }}
      />
      {showSparkline && (
        <div
          data-testid="kpi-tile-sparkline"
          data-trend={sparkline?.trend}
          // marginTop:auto pushes the sparkline to the bottom of the flex
          // column so its top edge sits at a consistent y across the row.
          style={{ marginTop: 'auto', paddingTop: 6 }}
        >
          <TpSparkline
            data={sparkRows}
            dataKey="v"
            xKey="t"
            height={28}
            ariaLabel={sparkAriaLabel}
          />
        </div>
      )}
    </Card>
  );
}
