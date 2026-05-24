/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LabelAssociationCreate } from '../models/LabelAssociationCreate';
import type { LabelAssociationResponse } from '../models/LabelAssociationResponse';
import type { LabelCreate } from '../models/LabelCreate';
import type { LabelResponse } from '../models/LabelResponse';
import type { LabelUpdate } from '../models/LabelUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class LabelsService {
    /**
     * List Labels
     * List the calling tenant's label catalog rows.
     * @param entityType
     * @param limit
     * @param offset
     * @returns LabelResponse Successful Response
     * @throws ApiError
     */
    public static listLabelsLabelsGet(
        entityType?: ('asset' | 'site' | 'zone' | 'device' | 'category' | 'tag' | null),
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<Array<LabelResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/labels',
            query: {
                'entity_type': entityType,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Label
     * Create a new label catalog row. ``entity_type`` is fixed here
     * and cannot be changed later.
     * @param requestBody
     * @returns LabelResponse Successful Response
     * @throws ApiError
     */
    public static createLabelLabelsPost(
        requestBody: LabelCreate,
    ): CancelablePromise<LabelResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/labels',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Label
     * Delete a label. Admin only. 409 if any entity still references
     * it; payload includes ``association_count`` so the UI can render
     * a guarded confirmation flow ("This label is in use on N items.
     * Detach them first.").
     * @param labelId
     * @returns void
     * @throws ApiError
     */
    public static deleteLabelLabelsLabelIdDelete(
        labelId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/labels/{label_id}',
            path: {
                'label_id': labelId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Label
     * Get one label by id.
     * @param labelId
     * @returns LabelResponse Successful Response
     * @throws ApiError
     */
    public static getLabelLabelsLabelIdGet(
        labelId: string,
    ): CancelablePromise<LabelResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/labels/{label_id}',
            path: {
                'label_id': labelId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Label
     * Partial update. ``entity_type`` is immutable per ADR 020.
     *
     * Pydantic drops unknown fields by default; the explicit check
     * against the raw payload defends against future schema changes
     * that might inadvertently re-add the field.
     * @param labelId
     * @param requestBody
     * @returns LabelResponse Successful Response
     * @throws ApiError
     */
    public static updateLabelLabelsLabelIdPatch(
        labelId: string,
        requestBody: LabelUpdate,
    ): CancelablePromise<LabelResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/labels/{label_id}',
            path: {
                'label_id': labelId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Entity Labels
     * List all label-value pairs attached to one entity.
     * @param entitySegment
     * @param entityId
     * @returns LabelAssociationResponse Successful Response
     * @throws ApiError
     */
    public static listEntityLabelsEntitySegmentEntityIdLabelsGet(
        entitySegment: string,
        entityId: string,
    ): CancelablePromise<Array<LabelAssociationResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/{entity_segment}/{entity_id}/labels',
            path: {
                'entity_segment': entitySegment,
                'entity_id': entityId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Associate Label
     * Attach a label-value pair to an entity. The label is identified
     * by ``key`` (scoped to the URL's entity_type); a 404 is returned
     * if no matching catalog row exists. 409 on cap (30) or duplicate
     * association.
     * @param entitySegment
     * @param entityId
     * @param requestBody
     * @returns LabelAssociationResponse Successful Response
     * @throws ApiError
     */
    public static associateLabelEntitySegmentEntityIdLabelsPost(
        entitySegment: string,
        entityId: string,
        requestBody: LabelAssociationCreate,
    ): CancelablePromise<LabelAssociationResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/{entity_segment}/{entity_id}/labels',
            path: {
                'entity_segment': entitySegment,
                'entity_id': entityId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Disassociate Label
     * Remove a label-value pair from an entity.
     * @param entitySegment
     * @param entityId
     * @param labelId
     * @returns void
     * @throws ApiError
     */
    public static disassociateLabelEntitySegmentEntityIdLabelsLabelIdDelete(
        entitySegment: string,
        entityId: string,
        labelId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/{entity_segment}/{entity_id}/labels/{label_id}',
            path: {
                'entity_segment': entitySegment,
                'entity_id': entityId,
                'label_id': labelId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
