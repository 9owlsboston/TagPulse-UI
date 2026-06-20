// Sprint 38 row 3.9c — Asset Detail Events Log.
//
// Pure synthesis of lifecycle events for a single asset from data already
// fetched by AssetDetail (asset row + bindings + external positions). Lives
// in lib/ as a pure function so it can be tested without React/render.
//
// Why no backend call: the existing `GET /admin/audit-logs` is admin-only
// and doesn't accept a `resource_id` filter (`src/tagpulse/core/audit.py`
// `list_logs` only supports `resource_type` + `actions`). Surfacing a true
// audit-log feed scoped to a single asset would require a backend slice
// (open the endpoint to editor+ and add `resource_id` filtering). That's
// deferred to a follow-up; this tab gives operators a useful lifecycle
// view today using data the page already has.
//
// Sources of events:
//   * Asset created  → asset.created_at
//   * Asset updated  → asset.updated_at (only if it differs from created_at
//                      by more than 1s, to suppress write-then-no-edit noise)
//   * Asset retired  → asset.updated_at when status === 'retired'
//   * Bound          → bindings[].bound_at
//   * Unbound        → bindings[].unbound_at (when not null)
//   * External fix   → externalPositions[].recorded_at
//
// Raw tag reads (which can be thousands per day) are intentionally excluded
// — they have a dedicated "Reads" tab. The Events Log focuses on
// lifecycle events the operator would otherwise need to reconstruct from
// staring at the Bindings table + the Reads timeline simultaneously.

import type { AssetResponse } from '@/api/generated/models/AssetResponse';
import type { AssetTagBindingResponse } from '@/api/generated/models/AssetTagBindingResponse';
import type { ExternalLocationResponse } from '@/api/generated/models/ExternalLocationResponse';

export type AssetEventKind =
  | 'created'
  | 'updated'
  | 'retired'
  | 'bound'
  | 'unbound'
  | 'external_position';

export interface AssetEvent {
  /** Stable key for React reconciliation. */
  key: string;
  /** ISO-8601 timestamp. */
  at: string;
  kind: AssetEventKind;
  /** Short human-readable summary suitable for a table cell. */
  summary: string;
  /** Optional structured payload for the details column. */
  details?: Record<string, unknown>;
}

const UPDATE_NOISE_FLOOR_MS = 1_000;

/**
 * Build a time-sorted (newest-first) sequence of lifecycle events for a
 * single asset.
 *
 * @param asset The asset row (always present once AssetDetail has loaded).
 * @param bindings All bindings for the asset (active + historical). May be
 *   undefined while the bindings query is still in flight.
 * @param externalPositions External (TMS/manual) position fixes for the
 *   asset. May be undefined while the query is in flight.
 */
export function buildAssetEvents(
  asset: AssetResponse,
  bindings: AssetTagBindingResponse[] | undefined,
  externalPositions: ExternalLocationResponse[] | undefined,
): AssetEvent[] {
  const events: AssetEvent[] = [];

  events.push({
    key: `created-${asset.id}`,
    at: asset.created_at,
    kind: 'created',
    summary: 'Asset created',
    details: { name: asset.name },
  });

  const createdMs = Date.parse(asset.created_at);
  const updatedMs = Date.parse(asset.updated_at);
  if (
    Number.isFinite(createdMs) &&
    Number.isFinite(updatedMs) &&
    updatedMs - createdMs > UPDATE_NOISE_FLOOR_MS
  ) {
    if (asset.status === 'retired') {
      events.push({
        key: `retired-${asset.id}-${asset.updated_at}`,
        at: asset.updated_at,
        kind: 'retired',
        summary: 'Asset retired',
      });
    } else {
      events.push({
        key: `updated-${asset.id}-${asset.updated_at}`,
        at: asset.updated_at,
        kind: 'updated',
        summary: 'Asset updated',
      });
    }
  }

  for (const b of bindings ?? []) {
    events.push({
      key: `bound-${b.id}`,
      at: b.bound_at,
      kind: 'bound',
      summary: `${b.binding_kind.toUpperCase()} ${b.binding_value} bound`,
      details: { binding_id: b.id, binding_kind: b.binding_kind, binding_value: b.binding_value },
    });
    if (b.unbound_at !== null) {
      events.push({
        key: `unbound-${b.id}`,
        at: b.unbound_at,
        kind: 'unbound',
        summary: `${b.binding_kind.toUpperCase()} ${b.binding_value} unbound`,
        details: { binding_id: b.id, binding_kind: b.binding_kind, binding_value: b.binding_value },
      });
    }
  }

  for (const p of externalPositions ?? []) {
    events.push({
      key: `extpos-${p.id}`,
      at: p.recorded_at,
      kind: 'external_position',
      summary: `External position (${p.source}) at ${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}`,
      details: {
        source: p.source,
        latitude: p.latitude,
        longitude: p.longitude,
        accuracy_meters: p.accuracy_meters,
      },
    });
  }

  // Newest first. Stable on equal timestamps via key suffix.
  events.sort((a, b) => {
    if (a.at === b.at) return a.key < b.key ? 1 : -1;
    return a.at < b.at ? 1 : -1;
  });

  return events;
}
