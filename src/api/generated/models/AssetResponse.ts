/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Persisted asset row.
 */
export type AssetResponse = {
    asset_type: string;
    created_at: string;
    external_ref: (string | null);
    id: string;
    metadata?: (Record<string, any> | null);
    name: string;
    parent_asset_id: (string | null);
    status: string;
    tenant_id: string;
    updated_at: string;
};

