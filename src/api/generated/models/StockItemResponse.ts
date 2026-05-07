/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type StockItemResponse = {
    id: string;
    tenant_id: string;
    product_id: string;
    lot_id: (string | null);
    parent_stock_item_id?: (string | null);
    binding_value: string;
    binding_kind: string;
    state: string;
    current_zone_id: (string | null);
    first_seen_at: string;
    last_seen_at: string;
    consumed_at: (string | null);
    metadata?: (Record<string, any> | null);
};

