/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ProductCreate = {
    sku: string;
    gtin?: (string | null);
    name: string;
    category?: (string | null);
    unit?: ProductCreate.unit;
    attributes?: (Record<string, any> | null);
};
export namespace ProductCreate {
    export enum unit {
        EACH = 'each',
        CASE = 'case',
        PALLET = 'pallet',
    }
}

