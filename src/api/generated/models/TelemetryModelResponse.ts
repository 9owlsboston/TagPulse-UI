/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MetricDefinition } from './MetricDefinition';
/**
 * Telemetry model definition returned from the API.
 */
export type TelemetryModelResponse = {
    created_at: string;
    device_type?: (string | null);
    id: string;
    metrics: Array<MetricDefinition>;
    subject_kind?: TelemetryModelResponse.subject_kind;
    updated_at: string;
};
export namespace TelemetryModelResponse {
    export enum subject_kind {
        DEVICE = 'device',
        ASSET = 'asset',
        LOT = 'lot',
        STOCK_ITEM = 'stock_item',
        ZONE = 'zone',
    }
}

