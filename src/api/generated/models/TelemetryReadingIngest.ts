/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * A single subject-scoped telemetry reading (HTTP / MQTT ingest).
 *
 * Same shape as :class:`TelemetryReading` plus the resolved subject
 * fields the caller wants attribution against. ``device_id`` is the
 * optional reporting device for cross-reference (e.g. the gateway
 * that uplinked an external observation).
 */
export type TelemetryReadingIngest = {
    subject_kind: TelemetryReadingIngest.subject_kind;
    subject_id: string;
    timestamp: string;
    metric_name: string;
    metric_value: number;
    unit?: (string | null);
    source?: TelemetryReadingIngest.source;
    device_id?: (string | null);
    metadata?: (Record<string, any> | null);
};
export namespace TelemetryReadingIngest {
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

