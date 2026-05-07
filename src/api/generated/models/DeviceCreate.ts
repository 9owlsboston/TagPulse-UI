/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Register a new device (reader).
 */
export type DeviceCreate = {
    name: string;
    device_type?: string;
    metadata?: (Record<string, any> | null);
    configuration?: (Record<string, any> | null);
    firmware_version?: (string | null);
};

