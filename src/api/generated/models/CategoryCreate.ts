/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Create a category.
 */
export type CategoryCreate = {
    category_type: CategoryCreate.category_type;
    description?: (string | null);
    name: string;
    required_tags?: number;
    sku_upc?: (string | null);
};
export namespace CategoryCreate {
    export enum category_type {
        LIQUID_CONTAINER = 'liquid_container',
        REFERENCE_TAG = 'reference_tag',
        RTI_CONTAINER = 'rti_container',
        OBJECT = 'object',
    }
}

