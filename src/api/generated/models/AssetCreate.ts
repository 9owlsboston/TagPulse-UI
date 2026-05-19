/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Create an asset.
 *
 * Sprint 41 Phase H (ADR 019 close-out): ``category_id`` is now
 * **required** — every asset must point at a Category. The legacy
 * ``asset_type`` String field has been dropped.
 */
export type AssetCreate = {
    category_id: string;
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

