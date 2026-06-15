import { describe, it, expect } from 'vitest';
import { applyNavConfig, type NavItem, type NavSection } from '@/lib/nav';

// Minimal fixtures — applyNavConfig only reads `key` (and `items` for
// sections); icons/labels/roles are irrelevant to the visibility/order logic.
const item = (key: string): NavItem => ({ key, icon: null, label: key, minRole: 'viewer' });
const section = (key: string, items: string[]): NavSection => ({
  key,
  label: key,
  icon: null,
  items: items.map(item),
});

const top = (): NavItem[] => [item('/'), item('/tag-reads'), item('/alerts')];
const sections = (): NavSection[] => [
  section('sec-a', ['/assets', '/tags']),
  section('sec-b', ['/devices', '/rules']),
];

describe('applyNavConfig', () => {
  it('is a no-op for empty config (today\'s nav unchanged)', () => {
    const out = applyNavConfig(top(), sections(), { hidden: [], order: [], placement: {} });
    expect(out.top.map((i) => i.key)).toEqual(['/', '/tag-reads', '/alerts']);
    expect(out.sections.map((s) => s.key)).toEqual(['sec-a', 'sec-b']);
    expect(out.sections[0]?.items.map((i) => i.key)).toEqual(['/assets', '/tags']);
  });

  it('hides a top item by key', () => {
    const out = applyNavConfig(top(), sections(), { hidden: ['/alerts'], order: [], placement: {} });
    expect(out.top.map((i) => i.key)).toEqual(['/', '/tag-reads']);
  });

  it('hides a whole section by section key', () => {
    const out = applyNavConfig(top(), sections(), { hidden: ['sec-b'], order: [], placement: {} });
    expect(out.sections.map((s) => s.key)).toEqual(['sec-a']);
  });

  it('hides an item within a section', () => {
    const out = applyNavConfig(top(), sections(), { hidden: ['/tags'], order: [], placement: {} });
    expect(out.sections[0]?.items.map((i) => i.key)).toEqual(['/assets']);
  });

  it('drops a section that is emptied by item-level hides', () => {
    const out = applyNavConfig(top(), sections(), {
      hidden: ['/devices', '/rules'],
      order: [],
      placement: {},
    });
    expect(out.sections.map((s) => s.key)).toEqual(['sec-a']);
  });

  it('reorders sections by the order list', () => {
    const out = applyNavConfig(top(), sections(), { hidden: [], order: ['sec-b', 'sec-a'], placement: {} });
    expect(out.sections.map((s) => s.key)).toEqual(['sec-b', 'sec-a']);
  });

  it('reorders top items by the order list', () => {
    const out = applyNavConfig(top(), sections(), {
      hidden: [],
      order: ['/alerts', '/'],
      placement: {},
    });
    // listed keys first in order, unlisted ('/tag-reads') keeps original spot after
    expect(out.top.map((i) => i.key)).toEqual(['/alerts', '/', '/tag-reads']);
  });

  it('reorders items within a section from the same flat order list', () => {
    const out = applyNavConfig(top(), sections(), { hidden: [], order: ['/tags', '/assets'], placement: {} });
    expect(out.sections[0]?.items.map((i) => i.key)).toEqual(['/tags', '/assets']);
  });

  it('ignores unknown hidden/order keys', () => {
    const out = applyNavConfig(top(), sections(), {
      hidden: ['/does-not-exist'],
      order: ['/nope', 'sec-zzz'],
      placement: {},
    });
    expect(out.top.map((i) => i.key)).toEqual(['/', '/tag-reads', '/alerts']);
    expect(out.sections.map((s) => s.key)).toEqual(['sec-a', 'sec-b']);
  });
});

// ── Sprint 61: nav.placement (relocate movable items) ──────────────────────
// Fixtures mirror the real IA so the movable keys (/tag-reads default sec-tags;
// /sites,/map default sec-assets) line up with the MOVABLE_ITEMS registry.
const iaTop = (): NavItem[] => [item('/')];
const iaSections = (): NavSection[] => [
  section('sec-assets', ['/assets', '/sites', '/map']),
  section('sec-tags', ['/tags', '/tag-reads', '/tag-transfers']),
  section('sec-locations', []),
];

describe('applyNavConfig — placement (Sprint 61)', () => {
  it('is a no-op when every movable item is at its default parent', () => {
    const out = applyNavConfig(iaTop(), iaSections(), { hidden: [], order: [], placement: {} });
    expect(out.sections.find((s) => s.key === 'sec-tags')?.items.map((i) => i.key)).toEqual([
      '/tags',
      '/tag-reads',
      '/tag-transfers',
    ]);
    // Empty sec-locations is dropped.
    expect(out.sections.map((s) => s.key)).toEqual(['sec-assets', 'sec-tags']);
  });

  it('pins a movable item to the top band (TOP_PARENT)', () => {
    const out = applyNavConfig(iaTop(), iaSections(), {
      hidden: [],
      order: [],
      placement: { '/tag-reads': 'top' },
    });
    expect(out.top.map((i) => i.key)).toEqual(['/', '/tag-reads']);
    expect(out.sections.find((s) => s.key === 'sec-tags')?.items.map((i) => i.key)).toEqual([
      '/tags',
      '/tag-transfers',
    ]);
  });

  it('relocates Locations + Map into the Locations section', () => {
    const out = applyNavConfig(iaTop(), iaSections(), {
      hidden: [],
      order: [],
      placement: { '/sites': 'sec-locations', '/map': 'sec-locations' },
    });
    expect(out.sections.find((s) => s.key === 'sec-assets')?.items.map((i) => i.key)).toEqual([
      '/assets',
    ]);
    expect(out.sections.find((s) => s.key === 'sec-locations')?.items.map((i) => i.key)).toEqual([
      '/sites',
      '/map',
    ]);
  });

  it('hidden wins over placement for a relocated item', () => {
    const out = applyNavConfig(iaTop(), iaSections(), {
      hidden: ['/tag-reads'],
      order: [],
      placement: { '/tag-reads': 'top' },
    });
    expect(out.top.map((i) => i.key)).toEqual(['/']);
    expect(out.sections.find((s) => s.key === 'sec-tags')?.items.map((i) => i.key)).toEqual([
      '/tags',
      '/tag-transfers',
    ]);
  });

  it('does not move a movable item that filtered out (not present)', () => {
    const sections = (): NavSection[] => [
      section('sec-assets', ['/assets']),
      section('sec-locations', []),
    ];
    const out = applyNavConfig(iaTop(), sections(), {
      hidden: [],
      order: [],
      placement: { '/sites': 'sec-locations' },
    });
    expect(out.sections.map((s) => s.key)).toEqual(['sec-assets']);
  });
});
