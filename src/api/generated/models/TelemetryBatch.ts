/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TelemetryReading } from './TelemetryReading';
/**
 * Batched telemetry payload — HTTP and MQTT share this shape.
 */
export type TelemetryBatch = {
    device_id: string;
    readings: Array<TelemetryReading>;
};

