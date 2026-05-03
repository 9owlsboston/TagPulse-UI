/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * A single telemetry reading inside a batched payload.
 */
export type TelemetryReading = {
    metadata?: (Record<string, any> | null);
    metric_name: string;
    metric_value: number;
    timestamp: string;
    unit?: (string | null);
};

