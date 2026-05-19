/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Patch an asset.
 */
export type AssetUpdate = {
    category_id?: (string | null);
    external_ref?: (string | null);
    metadata?: (Record<string, any> | null);
    name?: (string | null);
    parent_asset_id?: (string | null);
    status?: ('active' | 'retired' | 'lost' | null);
};

