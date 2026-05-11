/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MetricDefinition } from './MetricDefinition';
/**
 * Define the telemetry schema for a subject (Sprint 14 → Sprint 18).
 *
 * ``device_type`` is required when ``subject_kind='device'`` (the
 * original Sprint 14 case) and must be omitted otherwise. The DB
 * enforces the same rule via ``ck_telemetry_models_device_type_required``.
 */
export type TelemetryModelCreate = {
    device_type?: (string | null);
    metrics: Array<MetricDefinition>;
    subject_kind?: TelemetryModelCreate.subject_kind;
};
export namespace TelemetryModelCreate {
    export enum subject_kind {
        DEVICE = 'device',
        ASSET = 'asset',
        LOT = 'lot',
        STOCK_ITEM = 'stock_item',
        ZONE = 'zone',
    }
}

