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
    device_id: (string | null);
    id: string;
    metadata?: (Record<string, any> | null);
    metric_name: string;
    metric_value: number;
    source: TelemetryReadingResponse.source;
    subject_id: string;
    subject_kind: TelemetryReadingResponse.subject_kind;
    timestamp: string;
    unit: (string | null);
};
export namespace TelemetryReadingResponse {
    export enum source {
        DEVICE = 'device',
        TAG = 'tag',
        EXTERNAL = 'external',
        DERIVED = 'derived',
    }
    export enum subject_kind {
        DEVICE = 'device',
        ASSET = 'asset',
        LOT = 'lot',
        STOCK_ITEM = 'stock_item',
        ZONE = 'zone',
    }
}

