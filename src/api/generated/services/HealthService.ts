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
     *
     * Kept for backward compatibility (Sprint 22 A6 + earlier callers). The
     * SPA contract is the richer ``/health/live`` shape.
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
    /**
     * Liveness Alias
     * Liveness probe — Sprint 25 A1 SPA contract.
     *
     * Returns ``{"status": "alive", "version": "<sha>", "build_time": "<iso8601>"}``
     * in <50ms with no DB / MQTT / migration touches. ``Cache-Control: no-store``
     * is set explicitly so the SWA edge / browser back-cache never memoize the
     * body — a stale "alive" response would defeat the SPA's startup gate when
     * the api goes down. Build identity comes from ``Settings.build_version`` and
     * ``Settings.build_time`` (Dockerfile-baked at image build time).
     * @returns any Successful Response
     * @throws ApiError
     */
    public static livenessAliasHealthLiveGet(): CancelablePromise<any> {
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
}
