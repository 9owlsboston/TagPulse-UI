/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DashboardSparklines } from '../models/DashboardSparklines';
import type { DashboardSummary } from '../models/DashboardSummary';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DashboardService {
    /**
     * Get Dashboard Sparklines
     * Return 7-day downsampled trend series for each Dashboard KPI tile.
     * @param days Look-back window in days.
     * @param bucketHours Bucket width in hours; default yields 28 points over 7 days.
     * @returns DashboardSparklines Successful Response
     * @throws ApiError
     */
    public static getDashboardSparklinesDashboardSparklinesGet(
        days: number = 7,
        bucketHours: number = 6,
    ): CancelablePromise<DashboardSparklines> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/dashboard/sparklines',
            query: {
                'days': days,
                'bucket_hours': bucketHours,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Dashboard Summary
     * Return one row of aggregate counts for the caller's tenant.
     * @returns DashboardSummary Successful Response
     * @throws ApiError
     */
    public static getDashboardSummaryDashboardSummaryGet(): CancelablePromise<DashboardSummary> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/dashboard/summary',
        });
    }
}
