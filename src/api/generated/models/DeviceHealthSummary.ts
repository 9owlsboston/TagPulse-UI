/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Device health snapshot.
 */
export type DeviceHealthSummary = {
    connection_state: string;
    device_id: string;
    error_rate: number;
    last_seen: (string | null);
    name: string;
    reads_last_hour: number;
    status: string;
};

