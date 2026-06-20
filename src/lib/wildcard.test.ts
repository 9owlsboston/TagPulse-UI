import { describe, expect, it } from 'vitest';
import { matchWildcard } from './wildcard';

/**
 * Canonical shared contract — mirrors `tests/unit/test_api_filters.py::VECTORS`
 * in the backend. Where the backend asserts the compiled ILIKE string, here we
 * assert the equivalent **match behavior** (the two must agree on outcomes).
 * Each row: [pattern, valueThatMatches[], valueThatDoesNotMatch[]].
 */
const VECTORS: Array<[string, string[], string[]]> = [
  // bare term → substring, case-insensitive
  ['reader', ['reader-03', 'My Reader 03', 'READER'], ['read', 'reade']],
  ['Reader-03', ['reader-03', 'xx reader-03 yy'], ['reader-04']],
  // wildcard present → anchored (whole value)
  ['reader-*', ['reader-03', 'reader-'], ['my-reader-03', 'reader']],
  ['*-dc', ['BOS-DC', 'bos-dc', '-dc'], ['dc-bos', 'dc']],
  ['*', ['anything', ''], []],
  ['r?ader', ['reader', 'rxader', 'RXADER'], ['reaader', 'rader']],
  ['a*b?c', ['aXXbYc', 'abYc'], ['abc', 'aXbXXc']],
  // escaped metacharacters → literal (so NOT anchored → substring)
  ['\\*', ['a*b', '*'], ['axb']],
  ['\\?', ['a?b', '?'], ['axb']],
  ['a\\*b', ['a*b literal', 'xa*by'], ['axb']],
  // SQL/regex metacharacters in input are literals, never wildcards
  ['50%', ['discount 50% off', '50%'], ['50 percent']],
  ['a_b', ['a_b', 'xa_by'], ['aXb']],
  ['a.b', ['a.b', 'xa.by'], ['aXb']],
];

describe('matchWildcard', () => {
  for (const [pattern, matches, nonMatches] of VECTORS) {
    it(`'${pattern}' matches the expected values`, () => {
      for (const v of matches) expect(matchWildcard(v, pattern)).toBe(true);
      for (const v of nonMatches) expect(matchWildcard(v, pattern)).toBe(false);
    });
  }

  it('treats an empty / whitespace pattern as no filter (matches everything)', () => {
    expect(matchWildcard('anything', '')).toBe(true);
    expect(matchWildcard('anything', '   ')).toBe(true);
    expect(matchWildcard(null, '')).toBe(true);
  });

  it('never matches null/undefined against a non-empty pattern', () => {
    expect(matchWildcard(null, 'reader')).toBe(false);
    expect(matchWildcard(undefined, 'reader')).toBe(false);
  });
});
