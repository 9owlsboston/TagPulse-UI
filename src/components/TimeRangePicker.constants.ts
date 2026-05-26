/**
 * Constants + pure helpers for <TimeRangePicker>.
 * Split from the component file so HMR (react-refresh/only-export-components)
 * stays clean — see Sprint 57 Phase C.1.
 */
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

export type TimeRangePreset = '15m' | '1h' | '24h' | '7d' | '30d' | 'custom';

export const PRESETS: { label: string; value: TimeRangePreset }[] = [
  { label: 'Last 15 minutes', value: '15m' },
  { label: 'Last hour', value: '1h' },
  { label: 'Last 24 hours', value: '24h' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Custom', value: 'custom' },
];

export const DEFAULT_PRESET = '24h' as const satisfies TimeRangePreset;

export function presetToRange(value: Exclude<TimeRangePreset, 'custom'>): [Dayjs, Dayjs] {
  const now = dayjs();
  switch (value) {
    case '15m': return [now.subtract(15, 'minute'), now];
    case '1h': return [now.subtract(1, 'hour'), now];
    case '24h': return [now.subtract(24, 'hour'), now];
    case '7d': return [now.subtract(7, 'day'), now];
    case '30d': return [now.subtract(30, 'day'), now];
  }
}

/** `(UTC±HH:MM)` for the current browser offset — matches ISO callbacks. */
export function getTzLabel(now: Dayjs = dayjs()): string {
  return `(UTC${now.format('Z')})`;
}
