/**
 * Adaptive time-bucket sizing for reads-per-hour style charts.
 *
 * Given a visible window, pick a bucket width (in minutes) so the series has a
 * useful number of points (~`TARGET_BUCKETS`) regardless of the window — a
 * 15-minute window gets 1-minute buckets, a 30-day window gets 12-hour buckets
 * — instead of always bucketing hourly, which left short windows with one or
 * two points and a brush that couldn't reveal anything finer.
 *
 * Steps are clamped to the backend's `bucket_minutes` range (1..1440).
 */
export const BUCKET_STEPS_MINUTES = [1, 5, 15, 30, 60, 180, 360, 720, 1440] as const;

/** Aim for roughly this many buckets across the visible window. */
const TARGET_BUCKETS = 80;

/** Smallest allowed bucket width (minutes) that keeps the window near the target point count. */
export function chooseBucketMinutes(windowMs: number): number {
  if (!Number.isFinite(windowMs) || windowMs <= 0) return 60;
  const ideal = windowMs / 60_000 / TARGET_BUCKETS;
  for (const step of BUCKET_STEPS_MINUTES) {
    if (step >= ideal) return step;
  }
  return 1440;
}

/** Human y-axis label for a bucket width, e.g. `Reads / min`, `Reads / 15 min`, `Reads / 3 h`. */
export function bucketLabel(bucketMinutes: number): string {
  if (bucketMinutes === 1) return 'Reads / min';
  if (bucketMinutes === 60) return 'Reads / hour';
  if (bucketMinutes === 1440) return 'Reads / day';
  if (bucketMinutes % 60 === 0) return `Reads / ${bucketMinutes / 60} h`;
  return `Reads / ${bucketMinutes} min`;
}
