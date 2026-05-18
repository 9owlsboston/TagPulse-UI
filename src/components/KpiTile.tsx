import Card from 'antd/es/card';
import Statistic from 'antd/es/statistic';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

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
  loading?: boolean;
}

export function KpiTile({ title, value, prefix, loading }: KpiTileProps) {
  const numericValue = typeof value === 'number' ? value : 0;
  const animated = useAnimatedCounter(numericValue);
  const displayValue = typeof value === 'number' ? animated : value;

  return (
    <Card>
      <Statistic title={title} value={displayValue} prefix={prefix} loading={loading} />
    </Card>
  );
}
