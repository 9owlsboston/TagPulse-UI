/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PendingBulkOperationResponse } from '../models/PendingBulkOperationResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class BulkOperationsService {
    /**
     * Get Pending Bulk Operation
     * Fetch a queued bulk op so the reviewing admin can inspect it.
     * @param pendingId
     * @returns PendingBulkOperationResponse Successful Response
     * @throws ApiError
     */
    public static getPendingBulkOperationBulkOperationsPendingIdGet(
        pendingId: string,
    ): CancelablePromise<PendingBulkOperationResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/bulk-operations/{pending_id}',
            path: {
                'pending_id': pendingId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Approve Pending Bulk Operation
     * Second admin approves; the queued op executes immediately.
     *
     * Per ADR 028 §Governance #4 the approver MUST differ from the
     * requester (``SELF_APPROVAL`` → 403). The stored payload's
     * content hash is re-verified before execution (tamper guard;
     * 409 on mismatch).
     * @param pendingId
     * @returns PendingBulkOperationResponse Successful Response
     * @throws ApiError
     */
    public static approvePendingBulkOperationBulkOperationsPendingIdApprovePost(
        pendingId: string,
    ): CancelablePromise<PendingBulkOperationResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/bulk-operations/{pending_id}/approve',
            path: {
                'pending_id': pendingId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Reject Pending Bulk Operation
     * Second admin denies; the queued op never executes.
     *
     * Self-rejection is blocked for symmetry with approve. If the
     * original requester wants to back out, ask the same colleague
     * they were asking to review.
     * @param pendingId
     * @returns PendingBulkOperationResponse Successful Response
     * @throws ApiError
     */
    public static rejectPendingBulkOperationBulkOperationsPendingIdRejectPost(
        pendingId: string,
    ): CancelablePromise<PendingBulkOperationResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/bulk-operations/{pending_id}/reject',
            path: {
                'pending_id': pendingId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
