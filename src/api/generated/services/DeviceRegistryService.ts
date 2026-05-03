/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DeviceCreate } from '../models/DeviceCreate';
import type { DeviceResponse } from '../models/DeviceResponse';
import type { DeviceUpdate } from '../models/DeviceUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DeviceRegistryService {
    /**
     * List Devices
     * List devices with optional filters.
     * @param status
     * @param deviceType
     * @param limit
     * @param offset
     * @returns DeviceResponse Successful Response
     * @throws ApiError
     */
    public static listDevicesDeviceRegistryGet(
        status?: (string | null),
        deviceType?: (string | null),
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<Array<DeviceResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/device-registry',
            query: {
                'status': status,
                'device_type': deviceType,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Register Device
     * Register a new device (reader).
     * @param requestBody
     * @returns DeviceResponse Successful Response
     * @throws ApiError
     */
    public static registerDeviceDeviceRegistryPost(
        requestBody: DeviceCreate,
    ): CancelablePromise<DeviceResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/device-registry',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Device
     * Get a single device by ID.
     * @param deviceId
     * @returns DeviceResponse Successful Response
     * @throws ApiError
     */
    public static getDeviceDeviceRegistryDeviceIdGet(
        deviceId: string,
    ): CancelablePromise<DeviceResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/device-registry/{device_id}',
            path: {
                'device_id': deviceId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Device
     * Update device fields (partial update).
     * @param deviceId
     * @param requestBody
     * @returns DeviceResponse Successful Response
     * @throws ApiError
     */
    public static updateDeviceDeviceRegistryDeviceIdPatch(
        deviceId: string,
        requestBody: DeviceUpdate,
    ): CancelablePromise<DeviceResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/device-registry/{device_id}',
            path: {
                'device_id': deviceId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Decommission Device
     * Decommission a device — sets status to 'decommissioned'.
     * @param deviceId
     * @returns DeviceResponse Successful Response
     * @throws ApiError
     */
    public static decommissionDeviceDeviceRegistryDeviceIdDecommissionPost(
        deviceId: string,
    ): CancelablePromise<DeviceResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/device-registry/{device_id}/decommission',
            path: {
                'device_id': deviceId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
