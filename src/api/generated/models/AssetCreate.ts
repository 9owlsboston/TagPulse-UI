/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Create an asset.
 */
export type AssetCreate = {
    name: string;
    asset_type: string;
    external_ref?: (string | null);
    status?: AssetCreate.status;
    parent_asset_id?: (string | null);
    metadata?: (Record<string, any> | null);
};
export namespace AssetCreate {
    export enum status {
        ACTIVE = 'active',
        RETIRED = 'retired',
        LOST = 'lost',
    }
}

