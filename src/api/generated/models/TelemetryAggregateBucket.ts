/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * One bucket from ``/telemetry/aggregates``.
 *
 * Returned in chronological order. Backed by ``cagg_telemetry_1m`` or
 * ``cagg_telemetry_1h`` depending on the requested ``bucket_seconds``;
 * falls back to a live ``time_bucket`` over ``telemetry_readings`` for
 * arbitrary intervals.
 */
export type TelemetryAggregateBucket = {
    avg_value: number;
    bucket: string;
    max_value: number;
    metric_name: string;
    min_value: number;
    sample_count: number;
    subject_id: string;
    subject_kind: TelemetryAggregateBucket.subject_kind;
};
export namespace TelemetryAggregateBucket {
    export enum subject_kind {
        DEVICE = 'device',
        ASSET = 'asset',
        LOT = 'lot',
        STOCK_ITEM = 'stock_item',
        ZONE = 'zone',
    }
}

