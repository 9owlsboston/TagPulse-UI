/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Inbound precomputed floor-frame ``(x, y)`` fix for an asset (BYO).
 *
 * Phase 1 of [floor-position-estimation.md](../design/floor-position-estimation.md):
 * an external location engine (vendor middleware, UWB, BLE-AoA) pushes a
 * resolved floor fix; stored in ``asset_positions`` with ``source='precomputed'``.
 * Coordinates are in the site ``coord_system`` units (the floor frame), not
 * lat/lon — the geographic sibling is ``POST /assets/{id}/external-position``.
 */
export type FloorPositionCreate = {
    confidence: number;
    metadata?: (Record<string, any> | null);
    recorded_at?: (string | null);
    site_id: string;
    'x': number;
    'y': number;
    'z'?: (number | null);
};

