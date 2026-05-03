/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * A quarantined telemetry reading awaiting model fix-up or review.
 */
export type TelemetryQuarantineResponse = {
    device_id: string;
    id: string;
    metric_name: string;
    metric_value: (number | null);
    raw_payload: Record<string, any>;
    reason: string;
    received_at: string;
};

