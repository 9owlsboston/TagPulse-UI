/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DashboardSummary } from '../models/DashboardSummary';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DashboardService {
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
