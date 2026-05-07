/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Persisted zone row.
 */
export type ZoneResponse = {
    id: string;
    tenant_id: string;
    site_id: string;
    name: string;
    kind: string;
    fixed_reader_ids?: (Array<string> | null);
    polygon_geojson?: (Record<string, any> | null);
    bbox_min_lat?: (number | null);
    bbox_max_lat?: (number | null);
    bbox_min_lon?: (number | null);
    bbox_max_lon?: (number | null);
    metadata?: (Record<string, any> | null);
    created_at: string;
    updated_at: string;
};

