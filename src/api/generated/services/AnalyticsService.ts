/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnalyticsResultResponse } from '../models/AnalyticsResultResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AnalyticsService {
    /**
     * Get Read Frequency
     * Query read frequency analytics results.
     * @param deviceId
     * @param start
     * @param end
     * @param metric
     * @param limit
     * @returns AnalyticsResultResponse Successful Response
     * @throws ApiError
     */
    public static getReadFrequencyAnalyticsReadFrequencyGet(
        deviceId?: (string | null),
        start?: (string | null),
        end?: (string | null),
        metric: string = 'reads_per_minute',
        limit: number = 100,
    ): CancelablePromise<Array<AnalyticsResultResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/analytics/read-frequency',
            query: {
                'device_id': deviceId,
                'start': start,
                'end': end,
                'metric': metric,
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
