/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Create a zone.
 *
 * Three kinds (mirrors the DB ``ck_zones_kind_payload`` CHECK):
 *
 * * ``reader_bound`` — requires a non-empty ``fixed_reader_ids`` list.
 * * ``geofence`` — requires ``polygon_geojson`` (a GeoJSON ``Polygon``).
 * * ``virtual`` — admin-defined logical grouping (no readers, no polygon).
 * Used for cross-cutting categories like ``Cold-chain``, ``FDA-controlled``,
 * or ``Critical assets``. Must NOT carry ``fixed_reader_ids`` or
 * ``polygon_geojson``.
 */
export type ZoneCreate = {
    site_id: string;
    name: string;
    kind?: ZoneCreate.kind;
    fixed_reader_ids?: (Array<string> | null);
    polygon_geojson?: (Record<string, any> | null);
    metadata?: (Record<string, any> | null);
};
export namespace ZoneCreate {
    export enum kind {
        READER_BOUND = 'reader_bound',
        GEOFENCE = 'geofence',
        VIRTUAL = 'virtual',
    }
}

