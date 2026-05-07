/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * A persisted ``telemetry_readings`` row (Sprint 18).
 *
 * The subject-scoped successor to :class:`TelemetryResponse`. Carries
 * the resolved subject (kind + id), the reporting device when known,
 * and the source vocabulary defined in
 * :doc:`docs/design/rfid-tag-data-model` §D4.
 */
export type TelemetryReadingResponse = {
    id: string;
    subject_kind: TelemetryReadingResponse.subject_kind;
    subject_id: string;
    device_id: (string | null);
    timestamp: string;
    metric_name: string;
    metric_value: number;
    unit: (string | null);
    source: TelemetryReadingResponse.source;
    metadata?: (Record<string, any> | null);
};
export namespace TelemetryReadingResponse {
    export enum subject_kind {
        DEVICE = 'device',
        ASSET = 'asset',
        LOT = 'lot',
        STOCK_ITEM = 'stock_item',
        ZONE = 'zone',
    }
    export enum source {
        DEVICE = 'device',
        TAG = 'tag',
        EXTERNAL = 'external',
        DERIVED = 'derived',
    }
}

