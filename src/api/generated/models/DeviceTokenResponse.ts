/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * One-time device-token reveal — never re-readable after this response.
 */
export type DeviceTokenResponse = {
    device_id: string;
    token: string;
    prefix: string;
    rotated_at: string;
};

