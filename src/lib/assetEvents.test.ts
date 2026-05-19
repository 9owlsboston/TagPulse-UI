/**
 * Asset events synthesis — Sprint 38 / row 3.9c.
 */
import { describe, expect, it } from 'vitest';
import type { AssetResponse } from '@/api/generated/models/AssetResponse';
import type { AssetTagBindingResponse } from '@/api/generated/models/AssetTagBindingResponse';
import type { ExternalLocationResponse } from '@/api/generated/models/ExternalLocationResponse';
import { buildAssetEvents } from './assetEvents';

const t = (iso: string) => iso; // readability helper

function mkAsset(overrides: Partial<AssetResponse> = {}): AssetResponse {
  return {
    id: 'asset-1',
    tenant_id: 'tenant-1',
    name: 'Forklift 7',
    status: 'active',
    external_ref: null,
    parent_asset_id: null,
    category_id: null,
    metadata: null,
    created_at: t('2026-01-01T00:00:00Z'),
    updated_at: t('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function mkBinding(
  overrides: Partial<AssetTagBindingResponse> = {},
): AssetTagBindingResponse {
  return {
    id: 'binding-1',
    tenant_id: 'tenant-1',
    asset_id: 'asset-1',
    binding_kind: 'epc',
    binding_value: 'urn:epc:1',
    bound_at: t('2026-01-02T00:00:00Z'),
    unbound_at: null,
    metadata: null,
    ...overrides,
  };
}

function mkExtPos(
  overrides: Partial<ExternalLocationResponse> = {},
): ExternalLocationResponse {
  return {
    id: 'extpos-1',
    tenant_id: 'tenant-1',
    asset_id: 'asset-1',
    source: 'tms-acme',
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy_meters: 5,
    heading_deg: null,
    speed_kph: null,
    metadata: null,
    recorded_at: t('2026-01-03T12:00:00Z'),
    ...overrides,
  };
}

describe('buildAssetEvents', () => {
  it('emits a single created event when nothing else has happened', () => {
    const events = buildAssetEvents(mkAsset(), [], []);
    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe('created');
    expect(events[0]?.at).toBe('2026-01-01T00:00:00Z');
    expect(events[0]?.summary).toBe('Asset created');
  });

  it('suppresses a noise-floor updated event when created_at ≈ updated_at', () => {
    const events = buildAssetEvents(
      mkAsset({
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.500Z',
      }),
      [],
      [],
    );
    expect(events.filter((e) => e.kind === 'updated')).toHaveLength(0);
  });

  it('emits updated when updated_at is meaningfully later than created_at', () => {
    const events = buildAssetEvents(
      mkAsset({
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-05T00:00:00Z',
      }),
      [],
      [],
    );
    expect(events.map((e) => e.kind)).toContain('updated');
  });

  it('emits retired (not updated) when status is retired', () => {
    const events = buildAssetEvents(
      mkAsset({
        status: 'retired',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-05T00:00:00Z',
      }),
      [],
      [],
    );
    const kinds = events.map((e) => e.kind);
    expect(kinds).toContain('retired');
    expect(kinds).not.toContain('updated');
  });

  it('emits bound + unbound pairs per binding row', () => {
    const events = buildAssetEvents(
      mkAsset(),
      [
        mkBinding({
          id: 'b1',
          bound_at: '2026-01-02T00:00:00Z',
          unbound_at: '2026-01-04T00:00:00Z',
          binding_kind: 'epc',
          binding_value: 'EPC-1',
        }),
        mkBinding({
          id: 'b2',
          bound_at: '2026-01-05T00:00:00Z',
          unbound_at: null,
          binding_kind: 'tid',
          binding_value: 'TID-2',
        }),
      ],
      [],
    );
    const kinds = events.map((e) => e.kind);
    expect(kinds.filter((k) => k === 'bound')).toHaveLength(2);
    expect(kinds.filter((k) => k === 'unbound')).toHaveLength(1);
    const unbound = events.find((e) => e.kind === 'unbound')!;
    expect(unbound.summary).toBe('EPC EPC-1 unbound');
  });

  it('emits one external_position event per external fix', () => {
    const events = buildAssetEvents(
      mkAsset(),
      [],
      [
        mkExtPos({ id: 'p1', source: 'tms-acme', latitude: 1, longitude: 2 }),
        mkExtPos({
          id: 'p2',
          source: 'manual',
          latitude: 3.5,
          longitude: 4.5,
          recorded_at: '2026-01-04T00:00:00Z',
        }),
      ],
    );
    const ext = events.filter((e) => e.kind === 'external_position');
    expect(ext).toHaveLength(2);
    expect(ext.some((e) => e.summary.includes('manual'))).toBe(true);
    expect(ext.some((e) => e.summary.includes('1.00000, 2.00000'))).toBe(true);
  });

  it('sorts newest-first across all sources', () => {
    const events = buildAssetEvents(
      mkAsset({
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }),
      [
        mkBinding({
          id: 'b1',
          bound_at: '2026-01-02T00:00:00Z',
          unbound_at: null,
        }),
      ],
      [mkExtPos({ id: 'p1', recorded_at: '2026-01-03T00:00:00Z' })],
    );
    const stamps = events.map((e) => e.at);
    const sortedDesc = [...stamps].sort((a, b) => (a < b ? 1 : -1));
    expect(stamps).toEqual(sortedDesc);
    expect(stamps[0]).toBe('2026-01-03T00:00:00Z'); // newest
  });

  it('handles undefined bindings + externalPositions safely', () => {
    const events = buildAssetEvents(mkAsset(), undefined, undefined);
    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe('created');
  });

  it('produces stable, unique keys', () => {
    const events = buildAssetEvents(
      mkAsset(),
      [
        mkBinding({ id: 'b1', bound_at: '2026-01-02T00:00:00Z', unbound_at: '2026-01-04T00:00:00Z' }),
        mkBinding({ id: 'b2', bound_at: '2026-01-02T00:00:00Z', unbound_at: null }),
      ],
      [],
    );
    const keys = events.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
