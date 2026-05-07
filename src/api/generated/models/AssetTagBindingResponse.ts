/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Persisted asset_tag_bindings row.
 */
export type AssetTagBindingResponse = {
    id: string;
    tenant_id: string;
    asset_id: string;
    binding_value: string;
    binding_kind: string;
    bound_at: string;
    unbound_at: (string | null);
    metadata?: (Record<string, any> | null);
};

