/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TagReadCreate } from '../models/TagReadCreate';
import type { TagReadResponse } from '../models/TagReadResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class IngestionService {
    /**
     * Create Tag Read
     * Ingest a single tag read event via HTTP push.
     * @param requestBody
     * @param backfill Sprint 58 (Q1): when true, the read still runs the full ingest pipeline (validation, enrichment, hypertable insert, telemetry rollups) but rule evaluation is suppressed and reads/minute analytics counters skip the row. Use this for replaying historical reads from the demo-tenant seed bundle so the curated alert set isn't polluted by alerts the seed step itself accidentally triggers.
     * @returns TagReadResponse Successful Response
     * @throws ApiError
     */
    public static createTagReadTagReadsPost(
        requestBody: TagReadCreate,
        backfill: boolean = false,
    ): CancelablePromise<TagReadResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tag-reads',
            query: {
                'backfill': backfill,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Tag Reads Batch
     * Ingest a batch of tag read events via HTTP push.
     *
     * Returns the count of accepted and clock-rejected events; rejected events
     * are dead-lettered per docs/design/edge-device-contract.md §3.5.
     * @param requestBody
     * @param backfill Sprint 58 (Q1): when true, the read still runs the full ingest pipeline (validation, enrichment, hypertable insert, telemetry rollups) but rule evaluation is suppressed and reads/minute analytics counters skip the row. Use this for replaying historical reads from the demo-tenant seed bundle so the curated alert set isn't polluted by alerts the seed step itself accidentally triggers.
     * @returns number Successful Response
     * @throws ApiError
     */
    public static createTagReadsBatchTagReadsBatchPost(
        requestBody: Array<TagReadCreate>,
        backfill: boolean = false,
    ): CancelablePromise<Record<string, number>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tag-reads/batch',
            query: {
                'backfill': backfill,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
