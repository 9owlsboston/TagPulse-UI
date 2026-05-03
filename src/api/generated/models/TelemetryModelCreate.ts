/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MetricDefinition } from './MetricDefinition';
/**
 * Define the telemetry schema for a device type.
 */
export type TelemetryModelCreate = {
    device_type: string;
    metrics: Array<MetricDefinition>;
};

