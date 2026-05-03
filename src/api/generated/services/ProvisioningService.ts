/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProvisionRequest } from '../models/ProvisionRequest';
import type { ProvisionStatusResponse } from '../models/ProvisionStatusResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ProvisioningService {
    /**
     * Approve Device
     * Approve a pending device (admin only).
     * @param deviceId
     * @returns void
     * @throws ApiError
     */
    public static approveDeviceDeviceRegistryDeviceIdApprovePost(
        deviceId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/device-registry/{device_id}/approve',
            path: {
                'device_id': deviceId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Reject Device
     * Reject a pending device (admin only).
     * @param deviceId
     * @returns void
     * @throws ApiError
     */
    public static rejectDeviceDeviceRegistryDeviceIdRejectPost(
        deviceId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/device-registry/{device_id}/reject',
            path: {
                'device_id': deviceId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Provision Device
     * Self-register a device using a tenant provisioning key.
     * @param requestBody
     * @returns string Successful Response
     * @throws ApiError
     */
    public static provisionDeviceDevicesProvisionPost(
        requestBody: ProvisionRequest,
    ): CancelablePromise<Record<string, string>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/devices/provision',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Check Provision Status
     * Check provisioning status of a device.
     * @param deviceName
     * @returns ProvisionStatusResponse Successful Response
     * @throws ApiError
     */
    public static checkProvisionStatusDevicesProvisionStatusGet(
        deviceName: string,
    ): CancelablePromise<ProvisionStatusResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/devices/provision/status',
            query: {
                'device_name': deviceName,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
