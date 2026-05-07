/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type StockItemCreate = {
    product_id: string;
    lot_id?: (string | null);
    parent_stock_item_id?: (string | null);
    binding_value: string;
    binding_kind?: StockItemCreate.binding_kind;
    metadata?: (Record<string, any> | null);
};
export namespace StockItemCreate {
    export enum binding_kind {
        EPC = 'epc',
        TID = 'tid',
    }
}

