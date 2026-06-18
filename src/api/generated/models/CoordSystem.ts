/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { GeoAnchor } from './GeoAnchor';
/**
 * Per-site floor coordinate frame (ADR-024).
 *
 * ``NULL`` on a site ⇒ geographic-only (lat/lon) rendering; when set, the
 * site renders as a floor plan in these local units. ``geo_anchor`` is the
 * optional seam to a future unified geographic overlay.
 */
export type CoordSystem = {
    extent_x: number;
    extent_y: number;
    geo_anchor?: (GeoAnchor | null);
    origin_anchor?: CoordSystem.origin_anchor;
    origin_device_id?: (string | null);
    rotation_deg?: number;
    units?: CoordSystem.units;
};
export namespace CoordSystem {
    export enum origin_anchor {
        NW_CORNER = 'nw_corner',
        SW_CORNER = 'sw_corner',
        DEVICE_ID = 'device_id',
    }
    export enum units {
        METERS = 'meters',
        FEET = 'feet',
    }
}

