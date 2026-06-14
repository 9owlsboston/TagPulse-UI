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
    const out = applyNavConfig(top(), sections(), { hidden: [], order: [] });
    expect(out.top.map((i) => i.key)).toEqual(['/', '/tag-reads', '/alerts']);
    expect(out.sections.map((s) => s.key)).toEqual(['sec-a', 'sec-b']);
    expect(out.sections[0]?.items.map((i) => i.key)).toEqual(['/assets', '/tags']);
  });

  it('hides a top item by key', () => {
    const out = applyNavConfig(top(), sections(), { hidden: ['/alerts'], order: [] });
    expect(out.top.map((i) => i.key)).toEqual(['/', '/tag-reads']);
  });

  it('hides a whole section by section key', () => {
    const out = applyNavConfig(top(), sections(), { hidden: ['sec-b'], order: [] });
    expect(out.sections.map((s) => s.key)).toEqual(['sec-a']);
  });

  it('hides an item within a section', () => {
    const out = applyNavConfig(top(), sections(), { hidden: ['/tags'], order: [] });
    expect(out.sections[0]?.items.map((i) => i.key)).toEqual(['/assets']);
  });

  it('drops a section that is emptied by item-level hides', () => {
    const out = applyNavConfig(top(), sections(), {
      hidden: ['/devices', '/rules'],
      order: [],
    });
    expect(out.sections.map((s) => s.key)).toEqual(['sec-a']);
  });

  it('reorders sections by the order list', () => {
    const out = applyNavConfig(top(), sections(), { hidden: [], order: ['sec-b', 'sec-a'] });
    expect(out.sections.map((s) => s.key)).toEqual(['sec-b', 'sec-a']);
  });

  it('reorders top items by the order list', () => {
    const out = applyNavConfig(top(), sections(), {
      hidden: [],
      order: ['/alerts', '/'],
    });
    // listed keys first in order, unlisted ('/tag-reads') keeps original spot after
    expect(out.top.map((i) => i.key)).toEqual(['/alerts', '/', '/tag-reads']);
  });

  it('reorders items within a section from the same flat order list', () => {
    const out = applyNavConfig(top(), sections(), { hidden: [], order: ['/tags', '/assets'] });
    expect(out.sections[0]?.items.map((i) => i.key)).toEqual(['/tags', '/assets']);
  });

  it('ignores unknown hidden/order keys', () => {
    const out = applyNavConfig(top(), sections(), {
      hidden: ['/does-not-exist'],
      order: ['/nope', 'sec-zzz'],
    });
    expect(out.top.map((i) => i.key)).toEqual(['/', '/tag-reads', '/alerts']);
    expect(out.sections.map((s) => s.key)).toEqual(['sec-a', 'sec-b']);
  });
});
