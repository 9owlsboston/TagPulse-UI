/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Persisted telemetry row.
 */
export type TelemetryResponse = {
    device_id: string;
    id: string;
    metadata?: (Record<string, any> | null);
    metric_name: string;
    metric_value: number;
    timestamp: string;
    unit: (string | null);
};

