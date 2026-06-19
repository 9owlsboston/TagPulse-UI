/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * A persisted ``asset_positions`` row (floor-frame ``(x, y)`` fix).
 *
 * Shared by ``POST /assets/{id}/position`` (the created row) and
 * ``GET /assets/{id}/floor-path`` (one point on the trail, ascending time).
 */
export type FloorPositionResponse = {
    asset_id: string;
    confidence: number;
    id: string;
    metadata?: (Record<string, any> | null);
    recorded_at: string;
    site_id: string;
    source: string;
    tenant_id: string;
    'x': number;
    'y': number;
    'z': (number | null);
};

