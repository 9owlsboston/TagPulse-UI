/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type StockItemCreate = {
    binding_kind?: StockItemCreate.binding_kind;
    binding_value: string;
    lot_id?: (string | null);
    metadata?: (Record<string, any> | null);
    product_id: string;
};
export namespace StockItemCreate {
    export enum binding_kind {
        EPC = 'epc',
        TID = 'tid',
    }
}

