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
    device_type: string;
    id: string;
    metrics: Array<MetricDefinition>;
    updated_at: string;
};

