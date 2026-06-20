import { describe, expect, it } from 'vitest';
import { bucketLabel, chooseBucketMinutes } from './bucketing';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('chooseBucketMinutes', () => {
  it('maps the TimeRangePicker presets to sensible bucket widths', () => {
    expect(chooseBucketMinutes(15 * MIN)).toBe(1); // 15m → ~15 points
    expect(chooseBucketMinutes(HOUR)).toBe(1); // 1h → 60 points
    expect(chooseBucketMinutes(24 * HOUR)).toBe(30); // 24h → 48 points
    expect(chooseBucketMinutes(7 * DAY)).toBe(180); // 7d → ~56 points
    expect(chooseBucketMinutes(30 * DAY)).toBe(720); // 30d → 60 points
  });

  it('never returns fewer minutes than a bucket can hold (monotonic in window)', () => {
    let prev = 0;
    for (const ms of [MIN, 15 * MIN, HOUR, 6 * HOUR, DAY, 7 * DAY, 30 * DAY, 365 * DAY]) {
      const b = chooseBucketMinutes(ms);
      expect(b).toBeGreaterThanOrEqual(prev);
      prev = b;
    }
  });

  it('falls back to hourly for non-positive or invalid windows', () => {
    expect(chooseBucketMinutes(0)).toBe(60);
    expect(chooseBucketMinutes(-1000)).toBe(60);
    expect(chooseBucketMinutes(Number.NaN)).toBe(60);
  });

  it('caps at the largest step for very large windows', () => {
    expect(chooseBucketMinutes(1000 * DAY)).toBe(1440);
  });
});

describe('bucketLabel', () => {
  it('renders readable units', () => {
    expect(bucketLabel(1)).toBe('Reads / min');
    expect(bucketLabel(15)).toBe('Reads / 15 min');
    expect(bucketLabel(30)).toBe('Reads / 30 min');
    expect(bucketLabel(60)).toBe('Reads / hour');
    expect(bucketLabel(180)).toBe('Reads / 3 h');
    expect(bucketLabel(1440)).toBe('Reads / day');
  });
});
