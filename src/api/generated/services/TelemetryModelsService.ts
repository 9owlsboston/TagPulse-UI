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
     * Get Telemetry Model By Subject
     * Sprint 19 subject-scoped telemetry-model lookup.
     *
     * For ``subject_kind='device'`` ``key`` is the device_type;
     * for non-device kinds the only model permitted per tenant is
     * addressed with any non-empty ``key`` (typically the same string as
     * ``subject_kind`` so URLs remain self-describing).
     * @param subjectKind
     * @param key
     * @returns TelemetryModelResponse Successful Response
     * @throws ApiError
     */
    public static getTelemetryModelBySubjectTelemetryModelsSubjectKindKeyGet(
        subjectKind: string,
        key: string,
    ): CancelablePromise<TelemetryModelResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/telemetry-models/{subject_kind}/{key}',
            path: {
                'subject_kind': subjectKind,
                'key': key,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * @deprecated
     * Get Telemetry Model Legacy
     * Removed in Sprint 21 (ADR-015 §6).
     *
     * The Sprint 19 301 redirect to ``/telemetry-models/device/{device_type}``
     * has been removed after one full retention cycle. Callers must address
     * the subject-scoped path directly. Returns 410 Gone with a Location-style
     * hint so any forgotten clients still get a clear migration message.
     * @param deviceType
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getTelemetryModelLegacyTelemetryModelsDeviceTypeGet(
        deviceType: string,
    ): CancelablePromise<any> {
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
