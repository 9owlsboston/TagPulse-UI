/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Persisted telemetry row.
 */
export type TelemetryResponse = {
    id: string;
    device_id: string;
    timestamp: string;
    metric_name: string;
    metric_value: number;
    unit: (string | null);
    metadata?: (Record<string, any> | null);
};

