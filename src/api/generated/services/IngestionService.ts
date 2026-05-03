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
     * @returns TagReadResponse Successful Response
     * @throws ApiError
     */
    public static createTagReadTagReadsPost(
        requestBody: TagReadCreate,
    ): CancelablePromise<TagReadResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tag-reads',
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
     * @param requestBody
     * @returns number Successful Response
     * @throws ApiError
     */
    public static createTagReadsBatchTagReadsBatchPost(
        requestBody: Array<TagReadCreate>,
    ): CancelablePromise<Record<string, number>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tag-reads/batch',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
