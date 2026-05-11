/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Manual stock adjustment (Sprint 27 B2).
 */
export type StockMovementCreate = {
    lot_id?: (string | null);
    movement_type: StockMovementCreate.movement_type;
    product_id: string;
    quantity?: number;
    reason: string;
    stock_item_id?: (string | null);
    zone_id?: (string | null);
};
export namespace StockMovementCreate {
    export enum movement_type {
        ENTER = 'enter',
        EXIT = 'exit',
        ADJUSTMENT = 'adjustment',
    }
}

