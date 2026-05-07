/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type StockItemUpdate = {
    state?: ('in_stock' | 'in_transit' | 'consumed' | 'expired' | 'lost' | null);
    lot_id?: (string | null);
    parent_stock_item_id?: (string | null);
    metadata?: (Record<string, any> | null);
};

