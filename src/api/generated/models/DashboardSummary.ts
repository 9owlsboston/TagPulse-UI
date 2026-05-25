/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Aggregate counts powering the operator landing page.
 *
 * Sprint 54 Phase 54.3 — one tenant-scoped read per page load.
 * All counts are point-in-time at ``generated_at``; clients use
 * that timestamp for cache-busting / staleness display on the
 * KPI tiles. Field semantics:
 *
 * - ``devices_online`` — devices whose ``last_seen`` is within
 * the last 5 minutes AND whose ``connection_state`` is
 * ``'connected'``. Strict AND because the stringly-typed
 * column drifts when the MQTT subscriber misses a disconnect.
 * - ``devices_total`` — all devices for the tenant.
 * - ``alerts_open_24h`` — alerts with ``status='open'`` and
 * ``triggered_at > now() - 24h``.
 * - ``reads_per_hour_now`` — ``tag_reads`` rows with
 * ``timestamp > now() - 1h``.
 * - ``assets_active`` — assets with ``status='active'``.
 * - ``tag_transfers_in_flight`` — cross-tenant tag-ownership
 * handoffs (ADR 028) in ``status='requested'``, counted on
 * either side via ``from_tenant_id = :t OR to_tenant_id = :t``.
 * - ``tag_recon_backlog`` — sum of the three ADR 028 §Governance
 * #5 reconciliation views (registered-unread, unregistered-
 * reading, bindings-on-retired) for the tenant. Operator
 * hygiene worklist size; not an alert.
 * - ``low_stock_count`` — distinct products with fewer than
 * ``tenants.low_stock_threshold`` active stock_items
 * (``state='in_stock' AND consumed_at IS NULL``). Default
 * threshold 3; overridable via ``PATCH /tenant/config``.
 * - ``tags_total`` — tags for the tenant. Predicate is selected
 * by ``tenants.dashboard_tags_count_mode`` — ``"all"`` counts
 * every row, ``"live"`` (default) counts
 * ``status IN ('registered', 'active')``, ``"non_terminal"``
 * counts ``status NOT IN ('retired', 'defective',
 * 'transferred_out')``. Overridable via ``PATCH /tenant/config``.
 * - ``sites_total`` — count of rows in ``sites`` for the tenant.
 * - ``zones_total`` — count of rows in ``zones`` for the tenant.
 * The Locations KPI tile renders the (sites, zones) pair as one
 * grouped tile.
 */
export type DashboardSummary = {
    alerts_open_24h: number;
    assets_active: number;
    devices_online: number;
    devices_total: number;
    generated_at: string;
    low_stock_count: number;
    reads_per_hour_now: number;
    sites_total: number;
    tag_recon_backlog: number;
    tag_transfers_in_flight: number;
    tags_total: number;
    zones_total: number;
};

