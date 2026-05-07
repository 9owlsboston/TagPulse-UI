/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Device health snapshot.
 */
export type DeviceHealthSummary = {
    device_id: string;
    name: string;
    status: string;
    connection_state: string;
    last_seen: (string | null);
    reads_last_hour: number;
    error_rate: number;
};

