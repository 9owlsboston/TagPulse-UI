/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TelemetryReadingIngest } from './TelemetryReadingIngest';
/**
 * Batched subject-scoped telemetry payload (HTTP / MQTT).
 */
export type TelemetryReadingsBatch = {
    readings: Array<TelemetryReadingIngest>;
};

