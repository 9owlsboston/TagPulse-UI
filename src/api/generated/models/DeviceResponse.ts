/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Device returned from the API.
 */
export type DeviceResponse = {
    configuration: (Record<string, any> | null);
    connection_state: string;
    created_at: string;
    device_type: string;
    firmware_version: (string | null);
    id: string;
    last_seen: (string | null);
    metadata: (Record<string, any> | null);
    name: string;
    status: string;
    updated_at: string;
};

