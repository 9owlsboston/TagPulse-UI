/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Persisted category row.
 */
export type CategoryResponse = {
    category_type: CategoryResponse.category_type;
    created_at: string;
    description: (string | null);
    id: string;
    name: string;
    required_tags: number;
    sku_upc: (string | null);
    tenant_id: string;
    updated_at: string;
};
export namespace CategoryResponse {
    export enum category_type {
        LIQUID_CONTAINER = 'liquid_container',
        REFERENCE_TAG = 'reference_tag',
        RTI_CONTAINER = 'rti_container',
        OBJECT = 'object',
    }
}

