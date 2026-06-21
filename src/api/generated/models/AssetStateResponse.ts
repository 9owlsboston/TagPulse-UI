/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AssetLegResponse } from './AssetLegResponse';
/**
 * One fused asset-state snapshot (Sprint 71, ADR-034).
 *
 * Produced by the consolidation worker as a ``read_count × recency``-weighted
 * fusion of the asset's bound-tag reads over the look-back window. ``frame`` is
 * ``reader`` / ``floor`` / ``geo`` / ``none``; ``zone_id`` is the voted zone
 * (``None`` for geo "in transit"). ``temperature_c``/``humidity_pct`` are the
 * weighted means. The same shape serves both the current snapshot
 * (``GET /assets/{id}/state``) and history rows (``…/state/history``).
 */
export type AssetStateResponse = {
    asset_id: string;
    confidence?: (number | null);
    frame: string;
    humidity_pct?: (number | null);
    latitude?: (number | null);
    longitude?: (number | null);
    open_leg?: (AssetLegResponse | null);
    sample_count?: number;
    site_id?: (string | null);
    tag_count?: number;
    temperature_c?: (number | null);
    time: string;
    'x'?: (number | null);
    'y'?: (number | null);
    zone_id?: (string | null);
};

