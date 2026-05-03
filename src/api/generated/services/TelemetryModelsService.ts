/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TelemetryModelCreate } from '../models/TelemetryModelCreate';
import type { TelemetryModelResponse } from '../models/TelemetryModelResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TelemetryModelsService {
    /**
     * List Telemetry Models
     * List all telemetry model definitions.
     * @returns TelemetryModelResponse Successful Response
     * @throws ApiError
     */
    public static listTelemetryModelsTelemetryModelsGet(): CancelablePromise<Array<TelemetryModelResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/telemetry-models',
        });
    }
    /**
     * Create Telemetry Model
     * Define the telemetry schema for a device type.
     * @param requestBody
     * @returns TelemetryModelResponse Successful Response
     * @throws ApiError
     */
    public static createTelemetryModelTelemetryModelsPost(
        requestBody: TelemetryModelCreate,
    ): CancelablePromise<TelemetryModelResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/telemetry-models',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Telemetry Model
     * Get telemetry model definition for a device type.
     * @param deviceType
     * @returns TelemetryModelResponse Successful Response
     * @throws ApiError
     */
    public static getTelemetryModelTelemetryModelsDeviceTypeGet(
        deviceType: string,
    ): CancelablePromise<TelemetryModelResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/telemetry-models/{device_type}',
            path: {
                'device_type': deviceType,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Telemetry Model
     * Delete a telemetry model definition.
     * @param modelId
     * @returns void
     * @throws ApiError
     */
    public static deleteTelemetryModelTelemetryModelsModelIdDelete(
        modelId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/telemetry-models/{model_id}',
            path: {
                'model_id': modelId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
