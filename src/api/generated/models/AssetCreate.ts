/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Create an asset.
 */
export type AssetCreate = {
    asset_type: string;
    category_id?: (string | null);
    external_ref?: (string | null);
    metadata?: (Record<string, any> | null);
    name: string;
    parent_asset_id?: (string | null);
    status?: AssetCreate.status;
};
export namespace AssetCreate {
    export enum status {
        ACTIVE = 'active',
        RETIRED = 'retired',
        LOST = 'lost',
    }
}

