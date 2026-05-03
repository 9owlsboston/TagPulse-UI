/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TelemetryBatch } from '../models/TelemetryBatch';
import type { TelemetryQuarantineResponse } from '../models/TelemetryQuarantineResponse';
import type { TelemetryResponse } from '../models/TelemetryResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TelemetryService {
    /**
     * List Telemetry
     * Query persisted telemetry readings with filters.
     * @param deviceId
     * @param metricName
     * @param start
     * @param end
     * @param limit
     * @returns TelemetryResponse Successful Response
     * @throws ApiError
     */
    public static listTelemetryTelemetryGet(
        deviceId?: (string | null),
        metricName?: (string | null),
        start?: (string | null),
        end?: (string | null),
        limit: number = 100,
    ): CancelablePromise<Array<TelemetryResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/telemetry',
            query: {
                'device_id': deviceId,
                'metric_name': metricName,
                'start': start,
                'end': end,
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Ingest Telemetry
     * Ingest a batch of telemetry readings via HTTP push.
     * @param requestBody
     * @returns number Successful Response
     * @throws ApiError
     */
    public static ingestTelemetryTelemetryPost(
        requestBody: TelemetryBatch,
    ): CancelablePromise<Record<string, number>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/telemetry',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Telemetry Quarantine
     * List quarantined telemetry readings for the current tenant.
     * @param deviceId
     * @param reason Filter by quarantine reason (unknown_metric, out_of_range, unit_mismatch, stale_timestamp).
     * @param limit
     * @param offset
     * @returns TelemetryQuarantineResponse Successful Response
     * @throws ApiError
     */
    public static listTelemetryQuarantineTelemetryQuarantineGet(
        deviceId?: (string | null),
        reason?: (string | null),
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<Array<TelemetryQuarantineResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/telemetry/quarantine',
            query: {
                'device_id': deviceId,
                'reason': reason,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
