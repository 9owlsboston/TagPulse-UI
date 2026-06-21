/** Compact elapsed/duration formatting (Sprint 72). */

/** Compact elapsed time since an ISO timestamp, e.g. "2h 14m" / "45m". */
export function fmtElapsed(fromIso: string, now: number = Date.now()): string {
  return fmtDurationMs(now - new Date(fromIso).getTime());
}

/** Compact duration from milliseconds, e.g. "2h 14m" / "45m". */
export function fmtDurationMs(ms: number): string {
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
