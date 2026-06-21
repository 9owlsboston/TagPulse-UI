/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FusionStrategy } from './FusionStrategy';
/**
 * Admin-only payload for toggling tenant feature flags.
 *
 * All fields are optional; PATCH semantics — only fields explicitly
 * provided are written. Sprint 19 added ``telemetry_subject_kinds``;
 * Sprint 22 added ``rate_limit_overrides`` (per-tenant ceilings —
 * keys ∈ ``{ingest, read, write, admin}``, values are
 * requests-per-minute; pass ``{}`` to clear all overrides). Sprint 54
 * added ``low_stock_threshold`` (1..10_000, default 3) — see the
 * ``low_stock_count`` field on ``GET /dashboard/summary``.
 */
export type TenantConfigUpdate = {
    dashboard_tags_count_mode?: ('all' | 'live' | 'non_terminal' | null);
    fusion_strategy?: (FusionStrategy | null);
    low_stock_threshold?: (number | null);
    rate_limit_overrides?: (Record<string, number> | null);
    telemetry_subject_kinds?: (Array<'device' | 'asset' | 'lot' | 'stock_item' | 'zone'> | null);
    tracking_modes?: (Array<'asset' | 'inventory'> | null);
};

