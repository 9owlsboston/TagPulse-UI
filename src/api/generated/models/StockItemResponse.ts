/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type StockItemResponse = {
    binding_kind: string;
    binding_value: string;
    consumed_at: (string | null);
    current_zone_id: (string | null);
    first_seen_at: string;
    id: string;
    last_seen_at: string;
    lot_id: (string | null);
    metadata?: (Record<string, any> | null);
    parent_stock_item_id?: (string | null);
    product_id: string;
    state: string;
    tenant_id: string;
};

