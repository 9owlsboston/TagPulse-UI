/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Device returned from the API.
 */
export type DeviceResponse = {
    id: string;
    name: string;
    device_type: string;
    status: string;
    metadata: (Record<string, any> | null);
    configuration: (Record<string, any> | null);
    firmware_version: (string | null);
    connection_state: string;
    last_seen: (string | null);
    mobility?: string;
    token_prefix?: (string | null);
    token_rotated_at?: (string | null);
    cert_thumbprint?: (string | null);
    cert_subject?: (string | null);
    created_at: string;
    updated_at: string;
};

