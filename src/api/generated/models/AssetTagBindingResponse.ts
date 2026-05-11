/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Persisted asset_tag_bindings row.
 */
export type AssetTagBindingResponse = {
    asset_id: string;
    binding_kind: string;
    binding_value: string;
    bound_at: string;
    id: string;
    metadata?: (Record<string, any> | null);
    tenant_id: string;
    unbound_at: (string | null);
};

