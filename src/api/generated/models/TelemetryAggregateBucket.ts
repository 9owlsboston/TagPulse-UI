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
    subject_kind: TelemetryAggregateBucket.subject_kind;
    subject_id: string;
    metric_name: string;
    bucket: string;
    avg_value: number;
    min_value: number;
    max_value: number;
    sample_count: number;
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

