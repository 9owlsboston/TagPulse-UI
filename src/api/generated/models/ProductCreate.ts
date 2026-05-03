/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ProductCreate = {
    attributes?: (Record<string, any> | null);
    category?: (string | null);
    gtin?: (string | null);
    name: string;
    sku: string;
    unit?: ProductCreate.unit;
};
export namespace ProductCreate {
    export enum unit {
        EACH = 'each',
        CASE = 'case',
        PALLET = 'pallet',
    }
}

