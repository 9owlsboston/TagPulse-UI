/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class HealthService {
    /**
     * Liveness
     * Liveness probe — fast, no dependency checks.
     * @returns string Successful Response
     * @throws ApiError
     */
    public static livenessHealthGet(): CancelablePromise<Record<string, string>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/health',
        });
    }
    /**
     * Liveness Alias
     * Liveness probe (k8s convention alias for ``/health``).
     * @returns string Successful Response
     * @throws ApiError
     */
    public static livenessAliasHealthLiveGet(): CancelablePromise<Record<string, string>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/health/live',
        });
    }
    /**
     * Readiness
     * Readiness probe — checks DB, MQTT, and migration version.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static readinessHealthReadyGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/health/ready',
        });
    }
    /**
     * Detail
     * Detailed health — includes queue sizes and component stats.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static detailHealthDetailGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/health/detail',
        });
    }
}
