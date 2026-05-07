/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * A single telemetry reading inside a batched payload.
 */
export type TelemetryReading = {
    timestamp: string;
    metric_name: string;
    metric_value: number;
    unit?: (string | null);
    metadata?: (Record<string, any> | null);
};

