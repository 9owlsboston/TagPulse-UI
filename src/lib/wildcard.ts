/**
 * Sprint 70 — wildcard pattern matching for list-page column filters.
 *
 * The browser-side mirror of the backend's `wildcard_to_ilike()`
 * (`src/tagpulse/api/filters.py`). The grammar MUST stay behaviourally
 * identical to the backend — the canonical contract is the shared vector
 * table (see `wildcard.test.ts` ↔ `tests/unit/test_api_filters.py`).
 *
 * Grammar (see `docs/design/sprint-70-table-filter.md` §2):
 *   - `*` matches zero or more characters; `?` matches exactly one.
 *   - `\*` / `\?` / `\\` are the literal `*` / `?` / `\`.
 *   - Every other character is a literal (regex metacharacters escaped).
 *   - No `*`/`?` present → substring match; a wildcard present → anchored
 *     (whole value). Always case-insensitive.
 *
 * Used by **client-side** tables (fully loaded). Server-paginated tables push
 * the raw pattern to the API instead (per ADR-030: never client-filter a
 * paginated table).
 */

const ESCAPABLE = new Set(['*', '?', '\\']);

/** True if `pattern` has a `*`/`?` that is not backslash-escaped. */
function hasUnescapedWildcard(pattern: string): boolean {
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '\\' && i + 1 < pattern.length && ESCAPABLE.has(pattern[i + 1]!)) {
      i++;
      continue;
    }
    if (c === '*' || c === '?') return true;
  }
  return false;
}

/** Escape a literal character for use inside a RegExp. */
function escapeRegexLiteral(ch: string): string {
  return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Compile a user wildcard `pattern` to a RegExp, or `null` for an empty
 * pattern (meaning "no filter"). Exported for tests; most callers use
 * {@link matchWildcard}.
 */
export function compileWildcard(pattern: string): RegExp | null {
  const p = pattern.trim();
  if (!p) return null;

  const anchored = hasUnescapedWildcard(p);
  const out: string[] = [];
  for (let i = 0; i < p.length; i++) {
    const c = p[i]!;
    if (c === '\\' && i + 1 < p.length && ESCAPABLE.has(p[i + 1]!)) {
      out.push(escapeRegexLiteral(p[i + 1]!));
      i++;
      continue;
    }
    if (c === '*') out.push('.*');
    else if (c === '?') out.push('.');
    else out.push(escapeRegexLiteral(c));
  }
  const body = out.join('');
  return new RegExp(anchored ? `^${body}$` : body, 'i');
}

/**
 * Test whether `value` matches the user wildcard `pattern`. An empty/whitespace
 * pattern matches everything (no filter). `null`/`undefined` values never match
 * a non-empty pattern.
 */
export function matchWildcard(value: string | null | undefined, pattern: string): boolean {
  const re = compileWildcard(pattern);
  if (re === null) return true;
  if (value == null) return false;
  return re.test(value);
}
