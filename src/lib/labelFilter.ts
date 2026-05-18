/**
 * Label filter helpers (Sprint 37 / remediation row 3.9b).
 *
 * The backend list endpoints (`/assets`, `/sites`, `/zones`, `/devices`)
 * accept a deep-object query string of the form
 *
 *     ?labels[priority]=high,low&labels[location]=warehouse-a
 *
 * Per ADR 020: AND across distinct keys, OR within comma-separated values
 * per key. ≤5 keys per request, ≤20 values per key. Key regex
 * `^[A-Za-z0-9_.+$]{3,24}$`, value regex `^[A-Za-z0-9._-]{1,64}$`.
 *
 * The generated OpenAPI client doesn't model the deep-object shape, so
 * list-page hooks fall back to the hand-written `request()` helper in
 * `client.ts` when a label filter is set. These helpers keep the encode /
 * decode logic in one place so the URL contract stays in lockstep with
 * the strip component and the URL-bound search params.
 */

export type LabelFilter = Record<string, string[]>;

/** Max distinct keys per request (server-side cap mirrored client-side). */
export const LABEL_FILTER_MAX_KEYS = 5;
/** Max values per key per request. */
export const LABEL_FILTER_MAX_VALUES_PER_KEY = 20;

const LABEL_KEY_RE = /^[A-Za-z0-9_.+$]{3,24}$/;
const LABEL_VALUE_RE = /^[A-Za-z0-9._-]{1,64}$/;

export function isValidLabelKey(key: string): boolean {
  return LABEL_KEY_RE.test(key);
}

export function isValidLabelValue(value: string): boolean {
  return LABEL_VALUE_RE.test(value);
}

/**
 * Normalize a label filter: drop keys with no values, trim, dedupe.
 * Returns a fresh object so callers can compare by reference.
 */
export function normalizeLabelFilter(filter: LabelFilter | undefined): LabelFilter {
  const out: LabelFilter = {};
  if (!filter) return out;
  for (const [k, vs] of Object.entries(filter)) {
    const key = k.trim();
    if (!key) continue;
    const seen = new Set<string>();
    const values: string[] = [];
    for (const v of vs) {
      const value = v.trim();
      if (!value) continue;
      if (seen.has(value)) continue;
      seen.add(value);
      values.push(value);
    }
    if (values.length === 0) continue;
    out[key] = values;
  }
  return out;
}

export function isEmptyLabelFilter(filter: LabelFilter | undefined): boolean {
  if (!filter) return true;
  for (const vs of Object.values(filter)) {
    if (vs.length > 0) return false;
  }
  return true;
}

/**
 * Encode a label filter as the query-string fragment expected by the
 * backend (no leading `?` or `&`). Empty/undefined → empty string.
 *
 * Brackets are intentionally **not** percent-encoded: the backend (and
 * common URL parsers) accept the literal `[`/`]`, and leaving them raw
 * keeps the resulting URL human-readable in network panels.
 */
export function encodeLabelFilter(filter: LabelFilter | undefined): string {
  const norm = normalizeLabelFilter(filter);
  const parts: string[] = [];
  for (const [k, vs] of Object.entries(norm)) {
    const values = vs.map((v) => encodeURIComponent(v)).join(',');
    parts.push(`labels[${encodeURIComponent(k)}]=${values}`);
  }
  return parts.join('&');
}

/**
 * Parse a label filter from a URLSearchParams instance (typically
 * `useSearchParams()` from react-router). Looks for keys matching
 * `labels[KEY]` and splits the value on `,`. Tolerant of duplicate
 * entries (later occurrences extend the value list).
 */
export function parseLabelFilterFromSearchParams(
  params: URLSearchParams,
): LabelFilter {
  const out: LabelFilter = {};
  for (const [k, v] of params.entries()) {
    const m = /^labels\[(.+)\]$/.exec(k);
    if (!m) continue;
    const key = decodeURIComponent(m[1]!);
    const values = v
      .split(',')
      .map((s) => decodeURIComponent(s).trim())
      .filter((s) => s.length > 0);
    if (values.length === 0) continue;
    const existing = out[key] ?? [];
    out[key] = [...existing, ...values];
  }
  return normalizeLabelFilter(out);
}

/**
 * Apply a label filter to a URLSearchParams instance in-place: strips
 * all existing `labels[...]` entries and re-emits one per filter key.
 */
export function applyLabelFilterToSearchParams(
  params: URLSearchParams,
  filter: LabelFilter | undefined,
): void {
  // Strip existing
  const drop: string[] = [];
  for (const k of params.keys()) {
    if (/^labels\[.+\]$/.test(k)) drop.push(k);
  }
  for (const k of drop) params.delete(k);
  // Re-emit normalized
  const norm = normalizeLabelFilter(filter);
  for (const [k, vs] of Object.entries(norm)) {
    params.set(`labels[${k}]`, vs.join(','));
  }
}
