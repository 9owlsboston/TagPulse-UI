/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Register a new device (reader).
 */
export type DeviceCreate = {
    configuration?: (Record<string, any> | null);
    device_type?: string;
    firmware_version?: (string | null);
    metadata?: (Record<string, any> | null);
    name: string;
};

