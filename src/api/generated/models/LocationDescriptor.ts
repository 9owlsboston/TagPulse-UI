/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Resolved, render-ready location for a tag read (Sprint 64).
 *
 * Query-time enrichment so the UI's single "Location" column needs no
 * client-side joins. ``kind`` discriminates the two regimes:
 *
 * - ``geo``  — mobile read with lat/lon (geographic map).
 * - ``floor`` — fixed read; the truthful location is the resolved
 * ``reader_bound`` zone (coordinates are a *map* concern, not a per-row one).
 * - ``none`` — neither a fix nor a resolvable zone.
 */
export type LocationDescriptor = {
    accuracy_m?: (number | null);
    kind: LocationDescriptor.kind;
    lat?: (number | null);
    lon?: (number | null);
    source?: (string | null);
    zone_id?: (string | null);
    zone_name?: (string | null);
};
export namespace LocationDescriptor {
    export enum kind {
        GEO = 'geo',
        FLOOR = 'floor',
        NONE = 'none',
    }
}

