/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Create a reader-bound zone (geofence kind reserved for Sprint 17a).
 */
export type ZoneCreate = {
    fixed_reader_ids?: (Array<string> | null);
    kind?: ZoneCreate.kind;
    metadata?: (Record<string, any> | null);
    name: string;
    polygon_geojson?: (Record<string, any> | null);
    site_id: string;
};
export namespace ZoneCreate {
    export enum kind {
        READER_BOUND = 'reader_bound',
        GEOFENCE = 'geofence',
    }
}

