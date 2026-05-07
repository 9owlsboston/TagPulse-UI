/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TelemetryAggregateBucket } from '../models/TelemetryAggregateBucket';
import type { TelemetryBatch } from '../models/TelemetryBatch';
import type { TelemetryQuarantineResponse } from '../models/TelemetryQuarantineResponse';
import type { TelemetryReadingResponse } from '../models/TelemetryReadingResponse';
import type { TelemetryReadingsBatch } from '../models/TelemetryReadingsBatch';
import type { TelemetryResponse } from '../models/TelemetryResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TelemetryService {
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
    /**
     * List Telemetry Readings
     * Subject-scoped telemetry query (Sprint 19).
     *
     * Returns rows from the new ``telemetry_readings`` hypertable. The
     * legacy device-only ``GET /telemetry`` endpoint stays as-is for the
     * Sprint 14 contract; this endpoint is the multi-subject successor.
     * @param subjectKind
     * @param subjectId
     * @param metricName
     * @param start
     * @param end
     * @param limit
     * @returns TelemetryReadingResponse Successful Response
     * @throws ApiError
     */
    public static listTelemetryReadingsTelemetryReadingsGet(
        subjectKind: 'device' | 'asset' | 'lot' | 'stock_item' | 'zone',
        subjectId: string,
        metricName?: (string | null),
        start?: (string | null),
        end?: (string | null),
        limit: number = 100,
    ): CancelablePromise<Array<TelemetryReadingResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/telemetry/readings',
            query: {
                'subject_kind': subjectKind,
                'subject_id': subjectId,
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
     * List Telemetry Aggregates
     * Time-bucketed avg/min/max/count for a single subject + metric.
     * @param subjectKind
     * @param subjectId
     * @param metricName
     * @param bucketSeconds Bucket width in seconds. 60 / 3600 hit the continuous aggregates; other values are computed live via time_bucket() over the raw hypertable.
     * @param start
     * @param end
     * @returns TelemetryAggregateBucket Successful Response
     * @throws ApiError
     */
    public static listTelemetryAggregatesTelemetryAggregatesGet(
        subjectKind: 'device' | 'asset' | 'lot' | 'stock_item' | 'zone',
        subjectId: string,
        metricName: string,
        bucketSeconds: number,
        start: string,
        end: string,
    ): CancelablePromise<Array<TelemetryAggregateBucket>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/telemetry/aggregates',
            query: {
                'subject_kind': subjectKind,
                'subject_id': subjectId,
                'metric_name': metricName,
                'bucket_seconds': bucketSeconds,
                'start': start,
                'end': end,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Ingest Telemetry Readings
     * Direct subject-scoped telemetry write (admin/editor only).
     *
     * For external systems publishing pre-resolved subject readings
     * (e.g. a TMS pushing per-asset GPS speed). Bypasses the tag-borne
     * fan-out path. Source defaults to ``"external"`` per the schema.
     * Each persisted row is published as ``Topic.TELEMETRY_RECORDED`` so
     * the Sprint 20 ``telemetry.threshold`` rule path fires here too.
     * @param requestBody
     * @returns TelemetryReadingResponse Successful Response
     * @throws ApiError
     */
    public static ingestTelemetryReadingsTelemetryReadingsIngestPost(
        requestBody: TelemetryReadingsBatch,
    ): CancelablePromise<Array<TelemetryReadingResponse>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/telemetry/readings/ingest',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
