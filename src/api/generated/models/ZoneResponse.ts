/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Persisted zone row.
 */
export type ZoneResponse = {
    bbox_max_lat?: (number | null);
    bbox_max_lon?: (number | null);
    bbox_min_lat?: (number | null);
    bbox_min_lon?: (number | null);
    created_at: string;
    fixed_reader_ids?: (Array<string> | null);
    id: string;
    kind: string;
    metadata?: (Record<string, any> | null);
    name: string;
    polygon_geojson?: (Record<string, any> | null);
    site_id: string;
    tenant_id: string;
    updated_at: string;
};

