/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Admin payload for setting the tenant's tile provider.
 *
 * ``provider`` is the raw blob persisted to ``tenants.tile_provider``;
 * schema is provider-specific (see ``services.map_config``).
 * Pass ``None`` to fall back to the system default (OSM public).
 */
export type TileProviderUpdate = {
    provider?: (Record<string, any> | null);
};

