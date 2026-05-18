/**
 * Label filter helpers — Sprint 37 / row 3.9b.
 */
import { describe, expect, it } from 'vitest';
import {
  applyLabelFilterToSearchParams,
  encodeLabelFilter,
  isEmptyLabelFilter,
  isValidLabelKey,
  isValidLabelValue,
  normalizeLabelFilter,
  parseLabelFilterFromSearchParams,
} from './labelFilter';

describe('labelFilter helpers', () => {
  describe('normalizeLabelFilter', () => {
    it('drops empty keys + trims values + dedupes', () => {
      expect(
        normalizeLabelFilter({
          priority: ['high', '  high  ', 'low'],
          empty: [],
          '   ': ['x'],
        }),
      ).toEqual({ priority: ['high', 'low'] });
    });

    it('returns empty object for undefined', () => {
      expect(normalizeLabelFilter(undefined)).toEqual({});
    });
  });

  describe('isEmptyLabelFilter', () => {
    it.each([
      [undefined, true],
      [{}, true],
      [{ priority: [] }, true],
      [{ priority: ['high'] }, false],
    ] as const)('empty=%j → %j', (input, expected) => {
      expect(isEmptyLabelFilter(input as never)).toBe(expected);
    });
  });

  describe('encodeLabelFilter', () => {
    it('encodes simple multi-key, multi-value', () => {
      const enc = encodeLabelFilter({
        priority: ['high', 'low'],
        location: ['warehouse-a'],
      });
      expect(enc).toBe('labels[priority]=high,low&labels[location]=warehouse-a');
    });

    it('drops empty filters', () => {
      expect(encodeLabelFilter({})).toBe('');
      expect(encodeLabelFilter(undefined)).toBe('');
    });

    it('percent-encodes values with reserved characters', () => {
      const enc = encodeLabelFilter({ region: ['a b', 'c+d'] });
      expect(enc).toBe('labels[region]=a%20b,c%2Bd');
    });
  });

  describe('parseLabelFilterFromSearchParams', () => {
    it('parses brackets back into a LabelFilter', () => {
      const sp = new URLSearchParams('labels[priority]=high,low&labels[loc]=wh-a');
      expect(parseLabelFilterFromSearchParams(sp)).toEqual({
        priority: ['high', 'low'],
        loc: ['wh-a'],
      });
    });

    it('decodes percent-encoded values', () => {
      const sp = new URLSearchParams('labels[region]=a%20b,c%2Bd');
      expect(parseLabelFilterFromSearchParams(sp)).toEqual({ region: ['a b', 'c+d'] });
    });

    it('ignores non-labels keys', () => {
      const sp = new URLSearchParams('q=foo&status=active&labels[k]=v');
      expect(parseLabelFilterFromSearchParams(sp)).toEqual({ k: ['v'] });
    });
  });

  describe('applyLabelFilterToSearchParams', () => {
    it('replaces existing labels entries', () => {
      const sp = new URLSearchParams('q=foo&labels[old]=x');
      applyLabelFilterToSearchParams(sp, { priority: ['high'] });
      expect(sp.get('q')).toBe('foo');
      expect(sp.get('labels[old]')).toBeNull();
      expect(sp.get('labels[priority]')).toBe('high');
    });

    it('strips labels entries when filter is empty', () => {
      const sp = new URLSearchParams('q=foo&labels[old]=x');
      applyLabelFilterToSearchParams(sp, {});
      expect(sp.get('labels[old]')).toBeNull();
      expect(sp.get('q')).toBe('foo');
    });
  });

  describe('regex validators', () => {
    it.each([
      ['priority', true],
      ['env.name', true],
      ['ab', false], // too short
      ['x'.repeat(25), false], // too long
      ['has space', false],
      ['valid$', true],
    ])('isValidLabelKey(%j) === %j', (input, expected) => {
      expect(isValidLabelKey(input)).toBe(expected);
    });

    it.each([
      ['high', true],
      ['warehouse-a', true],
      ['wh.1_a', true],
      ['', false],
      ['has space', false],
      ['x'.repeat(65), false],
    ])('isValidLabelValue(%j) === %j', (input, expected) => {
      expect(isValidLabelValue(input)).toBe(expected);
    });
  });
});
