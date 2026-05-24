/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DeadLetterResponse } from '../models/DeadLetterResponse';
import type { UsageRecord } from '../models/UsageRecord';
import type { UsageSummary } from '../models/UsageSummary';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AdminService {
    /**
     * List Audit Logs
     * List audit logs for this tenant.
     * @param resourceType
     * @param actions Comma-separated list of actions to filter by (e.g. 'device.token_rotated,device.cert_attached').
     * @param requestId Filter to audit entries carrying this bulk-op request_id (Sprint 50 Phase C5, ADR 028 §Governance #7).
     * @param batch Filter to audit entries scoped to this label batch value (Sprint 50 Phase C5, ADR 028 §Governance #7).
     * @param limit
     * @param offset
     * @returns any Successful Response
     * @throws ApiError
     */
    public static listAuditLogsAdminAuditLogsGet(
        resourceType?: (string | null),
        actions?: (string | null),
        requestId?: (string | null),
        batch?: (string | null),
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<Array<Record<string, any>>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/admin/audit-logs',
            query: {
                'resource_type': resourceType,
                'actions': actions,
                'request_id': requestId,
                'batch': batch,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Dead Letters
     * List dead-lettered events for this tenant.
     * @param limit
     * @param offset
     * @returns DeadLetterResponse Successful Response
     * @throws ApiError
     */
    public static listDeadLettersAdminDeadLetterGet(
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<Array<DeadLetterResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/admin/dead-letter',
            query: {
                'limit': limit,
                'offset': offset,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Abandon Dead Letter
     * Abandon a dead-lettered event.
     * @param eventId
     * @returns void
     * @throws ApiError
     */
    public static abandonDeadLetterAdminDeadLetterEventIdDelete(
        eventId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/admin/dead-letter/{event_id}',
            path: {
                'event_id': eventId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Retry Dead Letter
     * Mark a dead-lettered event for retry.
     * @param eventId
     * @returns void
     * @throws ApiError
     */
    public static retryDeadLetterAdminDeadLetterEventIdRetryPost(
        eventId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/admin/dead-letter/{event_id}/retry',
            path: {
                'event_id': eventId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Tag Collisions
     * Return cross-tenant collision count for a binding_value.
     *
     * Per docs/design/assets-and-zones.md §11 Q3: returns only the count of
     * *other* tenants with an active binding for this value, never their
     * identities. Increments ``tagpulse_tag_collisions_global_total``.
     * @param bindingValue
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getTagCollisionsAdminTagCollisionsGet(
        bindingValue: string,
    ): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/admin/tag-collisions',
            query: {
                'binding_value': bindingValue,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Usage
     * Get daily usage records for the authenticated tenant.
     * @param start
     * @param end
     * @returns UsageRecord Successful Response
     * @throws ApiError
     */
    public static getUsageAdminUsageGet(
        start?: (string | null),
        end?: (string | null),
    ): CancelablePromise<Array<UsageRecord>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/admin/usage',
            query: {
                'start': start,
                'end': end,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Usage Summary
     * Get aggregated usage totals per dimension for a billing period.
     * @param start
     * @param end
     * @returns UsageSummary Successful Response
     * @throws ApiError
     */
    public static getUsageSummaryAdminUsageSummaryGet(
        start?: (string | null),
        end?: (string | null),
    ): CancelablePromise<Array<UsageSummary>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/admin/usage/summary',
            query: {
                'start': start,
                'end': end,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
