import { describe, expect, it } from 'vitest';
import { fmtDurationMs, fmtElapsed } from '@/lib/duration';

describe('duration formatting', () => {
  it('formats sub-hour durations as minutes', () => {
    expect(fmtDurationMs(45 * 60000)).toBe('45m');
    expect(fmtDurationMs(0)).toBe('0m');
  });

  it('formats hours and minutes', () => {
    expect(fmtDurationMs((2 * 60 + 14) * 60000)).toBe('2h 14m');
    expect(fmtDurationMs(3 * 60 * 60000)).toBe('3h');
  });

  it('clamps negatives to 0', () => {
    expect(fmtDurationMs(-1000)).toBe('0m');
  });

  it('fmtElapsed measures from a past timestamp', () => {
    const now = new Date('2026-06-20T12:00:00Z').getTime();
    const past = new Date('2026-06-20T09:46:00Z').toISOString();
    expect(fmtElapsed(past, now)).toBe('2h 14m');
  });
});
