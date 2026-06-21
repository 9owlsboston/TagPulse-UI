/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DeviceHealthSummary } from '../models/DeviceHealthSummary';
import type { ReadsPerHour } from '../models/ReadsPerHour';
import type { TagReadResponse } from '../models/TagReadResponse';
import type { UniqueTagsPerWindow } from '../models/UniqueTagsPerWindow';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class QueryService {
    /**
     * Device Health
     * Get health summaries for all devices.
     * @param status
     * @returns DeviceHealthSummary Successful Response
     * @throws ApiError
     */
    public static deviceHealthDeviceHealthGet(
        status?: (string | null),
    ): CancelablePromise<Array<DeviceHealthSummary>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/device-health',
            query: {
                'status': status,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Single Device Health
     * Get health summary for a single device.
     * @param deviceId
     * @returns DeviceHealthSummary Successful Response
     * @throws ApiError
     */
    public static singleDeviceHealthDeviceHealthDeviceIdGet(
        deviceId: string,
    ): CancelablePromise<DeviceHealthSummary> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/device-health/{device_id}',
            path: {
                'device_id': deviceId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Query Tag Reads
     * Query tag reads with filters and pagination.
     * @param deviceId
     * @param tagId
     * @param tagQ Sprint 70 — wildcard search over ``tag_id`` (EPC). ``*`` / ``?`` glob (bare term = substring, anchored when a wildcard is present), case-insensitive. Combines with the other filters via AND. Use ``tag_id`` for an exact match.
     * @param epcQ Sprint 75 — wildcard search across the EPC identifier family (``tag_id`` / ``epc`` / ``epc_hex`` / ``tid``) via OR; same glob grammar as ``tag_q``. A read matches if any identifier matches.
     * @param start
     * @param end
     * @param hasLocation If true, only return reads with a location; if false, only without.
     * @param epcScheme Filter by decoded EPC scheme (e.g. 'sgtin-96', 'sscc-96', 'raw').
     * @param limit
     * @param offset
     * @returns TagReadResponse Successful Response
     * @throws ApiError
     */
    public static queryTagReadsTagReadsGet(
        deviceId?: (string | null),
        tagId?: (string | null),
        tagQ?: (string | null),
        epcQ?: (string | null),
        start?: (string | null),
        end?: (string | null),
        hasLocation?: (boolean | null),
        epcScheme?: (string | null),
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<Array<TagReadResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tag-reads',
            query: {
                'device_id': deviceId,
                'tag_id': tagId,
                'tag_q': tagQ,
                'epc_q': epcQ,
                'start': start,
                'end': end,
                'has_location': hasLocation,
                'epc_scheme': epcScheme,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Reads Per Hour
     * Get read counts per device per time bucket.
     *
     * ``bucket_minutes`` sets the bucket width (default 60 = hourly). Callers
     * showing a narrow window can request a finer bucket so the series has real
     * resolution instead of one or two hourly points.
     * @param deviceId
     * @param start
     * @param end
     * @param bucketMinutes
     * @returns ReadsPerHour Successful Response
     * @throws ApiError
     */
    public static readsPerHourTagReadsReadsPerHourGet(
        deviceId?: (string | null),
        start?: (string | null),
        end?: (string | null),
        bucketMinutes: number = 60,
    ): CancelablePromise<Array<ReadsPerHour>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tag-reads/reads-per-hour',
            query: {
                'device_id': deviceId,
                'start': start,
                'end': end,
                'bucket_minutes': bucketMinutes,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Unique Tags Per Window
     * Get unique tag counts per time window.
     * @param deviceId
     * @param start
     * @param end
     * @param windowMinutes
     * @returns UniqueTagsPerWindow Successful Response
     * @throws ApiError
     */
    public static uniqueTagsPerWindowTagReadsUniqueTagsGet(
        deviceId?: (string | null),
        start?: (string | null),
        end?: (string | null),
        windowMinutes: number = 60,
    ): CancelablePromise<Array<UniqueTagsPerWindow>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tag-reads/unique-tags',
            query: {
                'device_id': deviceId,
                'start': start,
                'end': end,
                'window_minutes': windowMinutes,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Recent Reads
     * Get the most recent tag reads for a specific device.
     * @param deviceId
     * @param limit
     * @returns TagReadResponse Successful Response
     * @throws ApiError
     */
    public static recentReadsTelemetryDeviceIdRecentReadsGet(
        deviceId: string,
        limit: number = 50,
    ): CancelablePromise<Array<TagReadResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/telemetry/{device_id}/recent-reads',
            path: {
                'device_id': deviceId,
            },
            query: {
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
