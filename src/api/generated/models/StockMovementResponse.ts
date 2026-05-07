/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type StockMovementResponse = {
    id: string;
    tenant_id: string;
    stock_item_id: string;
    from_zone_id: (string | null);
    to_zone_id: (string | null);
    movement_type: string;
    quantity: number;
    device_id: (string | null);
    occurred_at: string;
};

