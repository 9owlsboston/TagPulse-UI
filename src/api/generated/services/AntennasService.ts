/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AntennaResponse } from '../models/AntennaResponse';
import type { AntennaUpsert } from '../models/AntennaUpsert';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AntennasService {
    /**
     * List Antennas
     * @param deviceId
     * @returns AntennaResponse Successful Response
     * @throws ApiError
     */
    public static listAntennasDevicesDeviceIdAntennasGet(
        deviceId: string,
    ): CancelablePromise<Array<AntennaResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/devices/{device_id}/antennas',
            path: {
                'device_id': deviceId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Antenna
     * @param deviceId
     * @param port
     * @returns void
     * @throws ApiError
     */
    public static deleteAntennaDevicesDeviceIdAntennasPortDelete(
        deviceId: string,
        port: number,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/devices/{device_id}/antennas/{port}',
            path: {
                'device_id': deviceId,
                'port': port,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Upsert Antenna
     * Create or update the antenna at ``port`` (port 0 = the reader's spot).
     * @param deviceId
     * @param port
     * @param requestBody
     * @returns AntennaResponse Successful Response
     * @throws ApiError
     */
    public static upsertAntennaDevicesDeviceIdAntennasPortPut(
        deviceId: string,
        port: number,
        requestBody: AntennaUpsert,
    ): CancelablePromise<AntennaResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/devices/{device_id}/antennas/{port}',
            path: {
                'device_id': deviceId,
                'port': port,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
