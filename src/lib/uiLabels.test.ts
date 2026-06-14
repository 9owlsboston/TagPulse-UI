import { describe, it, expect } from 'vitest';
import { DEFAULT_LABELS, pluralizeLabel, resolveLabel } from '@/lib/uiLabels';

describe('DEFAULT_LABELS registry', () => {
  it('mirrors the backend canonical defaults (today\'s UI terms)', () => {
    expect(DEFAULT_LABELS.device).toBe('Device');
    expect(DEFAULT_LABELS.tagRead).toBe('Tag Read');
    expect(DEFAULT_LABELS.stockItem).toBe('Stock Item');
  });
});

describe('pluralizeLabel', () => {
  it('appends -s for regular nouns including skinned ones', () => {
    expect(pluralizeLabel('Device')).toBe('Devices');
    expect(pluralizeLabel('Reader')).toBe('Readers'); // the WM skin
    expect(pluralizeLabel('Asset')).toBe('Assets');
    expect(pluralizeLabel('Tag Read')).toBe('Tag Reads');
    expect(pluralizeLabel('Stock Item')).toBe('Stock Items');
  });

  it('uses -es for sibilant endings', () => {
    expect(pluralizeLabel('Box')).toBe('Boxes');
    expect(pluralizeLabel('Switch')).toBe('Switches');
    expect(pluralizeLabel('Bus')).toBe('Buses');
  });

  it('uses -ies for a consonant+y ending', () => {
    expect(pluralizeLabel('Facility')).toBe('Facilities');
  });
});

describe('resolveLabel', () => {
  it('prefers the server map value over the canonical default', () => {
    expect(resolveLabel({ device: 'Reader' }, 'device')).toBe('Reader');
  });

  it('falls back to the canonical default when the key is absent', () => {
    expect(resolveLabel({}, 'device')).toBe('Device');
    expect(resolveLabel(undefined, 'asset')).toBe('Asset');
  });
});
