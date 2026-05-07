/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Resolved tile-provider config returned to the UI.
 */
export type MapConfigResponse = {
    /**
     * Provider kind: osm | mapbox | maptiler | self_hosted
     */
    kind: string;
    tile_url_template: string;
    attribution: string;
    max_zoom?: number;
    subdomains?: (Array<string> | null);
};

