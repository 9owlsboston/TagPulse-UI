/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Admin-only payload for toggling tenant feature flags.
 *
 * All fields are optional; PATCH semantics — only fields explicitly
 * provided are written. Sprint 19 added ``telemetry_subject_kinds``;
 * Sprint 22 added ``rate_limit_overrides`` (per-tenant ceilings —
 * keys ∈ ``{ingest, read, write, admin}``, values are
 * requests-per-minute; pass ``{}`` to clear all overrides).
 */
export type TenantConfigUpdate = {
    rate_limit_overrides?: (Record<string, number> | null);
    telemetry_subject_kinds?: (Array<'device' | 'asset' | 'lot' | 'stock_item' | 'zone'> | null);
    tracking_modes?: (Array<'asset' | 'inventory'> | null);
};

