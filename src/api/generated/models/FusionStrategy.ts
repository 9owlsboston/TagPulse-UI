/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SlaConfig } from './SlaConfig';
/**
 * Per-tenant consolidation config (the ``tenants.fusion_strategy`` JSONB).
 *
 * The recency dial ``half_life_s`` (τ) is **shared** across the location vote
 * and the environment mean (``τ → 0`` collapses to *last-writer-wins* — only
 * the freshest read survives). ``recompute_interval_s`` (D) is the worker tick
 * cadence and ``lookback_s`` the window each tick consolidates over (both
 * consumed by the worker, not this pure core). ``rssi_floor_dbm`` drops weak
 * reads from the *location* vote (``None`` disables the floor); environment
 * readings are never RSSI-gated. ``sla`` (Sprint 72) is the optional per-tenant
 * cold-chain envelope used to score transit legs; ``None`` = no SLA scoring.
 */
export type FusionStrategy = {
    half_life_s?: number;
    lookback_s?: number;
    min_reads?: number;
    recompute_interval_s?: number;
    rssi_floor_dbm?: (number | null);
    sla?: (SlaConfig | null);
};

