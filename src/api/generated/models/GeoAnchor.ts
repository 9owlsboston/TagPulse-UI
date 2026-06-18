/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Pin one floor-local point ``(x, y)`` to a real-world lat/lon.
 *
 * Reserved seam for a future geo-anchored overlay (mobile + fixed readers on
 * one geographic map). Validated and stored now; no map consumes it yet.
 */
export type GeoAnchor = {
    lat: number;
    lng: number;
    'x': number;
    'y': number;
};

