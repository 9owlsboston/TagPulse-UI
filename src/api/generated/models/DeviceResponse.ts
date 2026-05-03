/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Device returned from the API.
 */
export type DeviceResponse = {
    cert_subject?: (string | null);
    cert_thumbprint?: (string | null);
    configuration: (Record<string, any> | null);
    connection_state: string;
    created_at: string;
    device_type: string;
    firmware_version: (string | null);
    id: string;
    last_seen: (string | null);
    metadata: (Record<string, any> | null);
    mobility?: string;
    name: string;
    status: string;
    token_prefix?: (string | null);
    token_rotated_at?: (string | null);
    updated_at: string;
};

