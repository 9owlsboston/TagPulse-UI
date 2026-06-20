/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_import_tags_tags_import_post } from '../models/Body_import_tags_tags_import_post';
import type { TagBulkOperationResult } from '../models/TagBulkOperationResult';
import type { TagBulkPatchRequest } from '../models/TagBulkPatchRequest';
import type { TagBulkRetireRequest } from '../models/TagBulkRetireRequest';
import type { TagCreate } from '../models/TagCreate';
import type { TagImportResult } from '../models/TagImportResult';
import type { TagResponse } from '../models/TagResponse';
import type { TagTransferRequest } from '../models/TagTransferRequest';
import type { TagTransferResponse } from '../models/TagTransferResponse';
import type { TagUpdate } from '../models/TagUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TagsService {
    /**
     * List Tag Transfers
     * @param direction
     * @param status
     * @param limit
     * @param offset
     * @returns TagTransferResponse Successful Response
     * @throws ApiError
     */
    public static listTagTransfersTagTransfersGet(
        direction?: (string | null),
        status?: (string | null),
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<Array<TagTransferResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tag-transfers',
            query: {
                'direction': direction,
                'status': status,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Tag Transfer
     * Initiate a cross-tenant transfer.
     *
     * Validation:
     * - Every EPC must be owned by the calling tenant and in
     * ``status='active'`` (only active tags can transfer out;
     * ``registered`` tags haven't been observed yet and
     * terminal-state tags can't move).
     * - The receiving tenant must exist and be ``active``.
     * - Self-transfers (``from == to``) are rejected.
     *
     * On success, writes one ``tag_transfers`` row per EPC, all
     * sharing one server-generated ``request_id``, in
     * ``status='requested'``. Phase B does **not** flip the source
     * tag's status — that happens at acknowledgement / completion in
     * the receiving-tenant flow (Phase C3).
     * @param requestBody
     * @returns TagTransferResponse Successful Response
     * @throws ApiError
     */
    public static createTagTransferTagTransfersPost(
        requestBody: TagTransferRequest,
    ): CancelablePromise<Array<TagTransferResponse>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tag-transfers',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Tag Transfer
     * @param transferId
     * @returns TagTransferResponse Successful Response
     * @throws ApiError
     */
    public static getTagTransferTagTransfersTransferIdGet(
        transferId: string,
    ): CancelablePromise<TagTransferResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tag-transfers/{transfer_id}',
            path: {
                'transfer_id': transferId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Tags
     * List the calling tenant's tag registry rows.
     * @param status
     * @param epcPrefix
     * @param bound
     * @param q Sprint 70 — wildcard search over ``epc_hex``. ``*`` / ``?`` glob (bare term = substring, anchored when a wildcard is present), case-insensitive. Combines with the other filters via AND.
     * @param limit
     * @param offset
     * @returns TagResponse Successful Response
     * @throws ApiError
     */
    public static listTagsTagsGet(
        status?: (string | null),
        epcPrefix?: (string | null),
        bound?: (boolean | null),
        q?: (string | null),
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<Array<TagResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tags',
            query: {
                'status': status,
                'epc_prefix': epcPrefix,
                'bound': bound,
                'q': q,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Tag
     * Create a tag in ``status='registered'``.
     *
     * The schema's regex runs against the *normalised* value so we
     * rewrite the payload before handing it to the repo. ``gs1_uri``
     * is derived in the repo from the same normalised value.
     * @param requestBody
     * @returns TagResponse Successful Response
     * @throws ApiError
     */
    public static createTagTagsPost(
        requestBody: TagCreate,
    ): CancelablePromise<TagResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tags',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Bulk Patch Tags
     * Apply a status and/or metadata change to a scoped set of tags.
     *
     * Per [ADR-028 §"Governance" rule 3](../../../../docs/adr/028-tags-as-first-class-entity.md):
     *
     * - Body MUST include ``scope`` with exactly one of:
     * ``labels.batch=<value>`` (other label keys allowed
     * alongside) **or** ``epc_list[]`` (1..1000 EPCs). 422 if
     * neither/both/oversized.
     * - At least one of ``status`` / ``metadata`` must be set.
     * - **400** on bad XOR (no dry_run and no confirm, or both).
     * - **422** if scope matches zero tags, or if any matched tag
     * would violate its status-transition edge list (all-or-
     * nothing: nothing is written).
     * - **200** on successful dry-run (token + expires_in + sample).
     * - **200** on successful sub-threshold commit.
     * - **202** when ``matched >= tenants.tag_bulk_two_person_threshold``
     * — queued for second-admin approval, ``pending_id`` returned.
     * - **409** on a bad confirmation token.
     *
     * The audit shape (``tag.bulk_patched``) is forward-compatible
     * with the C5 unified bulk-op audit envelope.
     * @param requestBody
     * @param dryRun Preview mode. Resolves the scope, validates per-tag status transitions, and (on success) mints a single-use confirmation token bound to the resolved EPC set + the requested mutation. Per ADR 028 §Governance #2 every bulk op is dry-run-first.
     * @param confirm Confirmation token from a prior successful dry-run. Mutually exclusive with dry_run=true. Binds to (tenant, user, scope, mutation) — confirming a different scope or mutation returns 409.
     * @returns TagBulkOperationResult Successful Response
     * @throws ApiError
     */
    public static bulkPatchTagsTagsBulkPatchPost(
        requestBody: TagBulkPatchRequest,
        dryRun: boolean = false,
        confirm?: (string | null),
    ): CancelablePromise<TagBulkOperationResult> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tags/bulk-patch',
            query: {
                'dry_run': dryRun,
                'confirm': confirm,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Bulk Retire Tags
     * Retire (status='retired') a scoped set of tags.
     *
     * Distinct from :func:`bulk_patch_tags` only by:
     *
     * - **admin-only** (retire is destructive enough to refuse the
     * editor role even though single-row PATCH allows it; ADR 028
     * §Governance #3 frames retire as the most common bulk
     * destructive op and we want the most-defensible default).
     * - audit action is ``tag.bulk_retired`` (greppable for
     * "who retired batch X" without filtering PATCH bodies).
     * - body has no ``status`` (implicit) or ``metadata`` (out of
     * scope here); it accepts an optional ``reason`` that's
     * attached to the audit-log entry only.
     *
     * All other governance rails (dry-run, confirmation token,
     * scope-XOR, two-person threshold) are identical to the bulk
     * PATCH endpoint.
     * @param requestBody
     * @param dryRun
     * @param confirm
     * @returns TagBulkOperationResult Successful Response
     * @throws ApiError
     */
    public static bulkRetireTagsTagsBulkRetirePost(
        requestBody: TagBulkRetireRequest,
        dryRun: boolean = false,
        confirm?: (string | null),
    ): CancelablePromise<TagBulkOperationResult> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tags/bulk-retire',
            query: {
                'dry_run': dryRun,
                'confirm': confirm,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Import Tags
     * Bulk-register tags from a CSV.
     *
     * Per ADR-028 OQ 4 + §Governance #2:
     *
     * - **400** if neither ``dry_run`` nor ``confirm`` is supplied, or
     * if both are supplied (mutually exclusive — preview first, then
     * commit with the returned token).
     * - **413** if file >8 MiB *or* row count >10 000.
     * - **429** if the tenant has already issued
     * ``tag_bulk_import_rate_limit`` imports in the trailing hour.
     * The counter advances *before* parsing so a malformed CSV
     * still counts toward the cap (catches the runaway-script
     * threat model exactly). Dry-runs and confirms each consume
     * one slot — the cap is on operator activity, not on writes.
     * - **422** if any row fails validation. Per the all-or-nothing
     * rule nothing is written and no token is minted; the response
     * body lists every offending row.
     * - **200** on a successful ``dry_run=true``. The response
     * includes ``token``, ``expires_in``, and a 10-EPC ``sample``.
     * - **409** if ``?confirm=<token>`` is supplied but the token
     * doesn't match this CSV (content drift, wrong operator,
     * wrong tenant, expired, or already consumed).
     * - **202** on a confirmed import whose row count meets or
     * exceeds ``tenants.tag_bulk_two_person_threshold`` (default
     * 10 000) per ADR 028 §Governance #4. The CSV is stashed in
     * ``pending_bulk_operations`` and ``pending_id`` is returned;
     * a second admin must POST ``/bulk-operations/{pending_id}/approve``
     * to execute. Nothing is written to ``tags`` yet.
     * - **201** on a successful confirmed import below the threshold.
     *
     * Every confirmed import writes one ``tag.bulk_imported`` audit
     * log entry covering the whole batch. Phase C5 unifies this
     * with the other bulk-op audit shapes; the keys we already emit
     * (``count``, ``request_id``) are forward-compatible.
     * @param formData
     * @param dryRun Preview mode. Validate the CSV and (on success) mint a single-use confirmation token bound to this CSV's content, tenant, and operator. Re-submit the same CSV with ?confirm=<token> to apply. Per ADR 028 §Governance #2 every bulk op is dry-run-first.
     * @param confirm Confirmation token from a prior successful dry-run. Mutually exclusive with dry_run=true. The token binds to (tenant, user, CSV content) — confirming a different CSV with the same token returns 409.
     * @returns TagImportResult Successful Response
     * @throws ApiError
     */
    public static importTagsTagsImportPost(
        formData: Body_import_tags_tags_import_post,
        dryRun: boolean = false,
        confirm?: (string | null),
    ): CancelablePromise<TagImportResult> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tags/import',
            query: {
                'dry_run': dryRun,
                'confirm': confirm,
            },
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Reconciliation View
     * Read-only exception views over the tag registry.
     *
     * Per ADR 028 §Governance rule #5: these views are read-only and
     * surface discrepancies the registrar worker can detect but
     * cannot self-heal. Viewer role is sufficient — exposing them is
     * a monitoring concern, not a write concern.
     *
     * See :mod:`tagpulse.services.tag_reconciliation` for the per-view
     * SQL semantics. CSV export emits a fixed header per view; an
     * empty result set still returns the header so spreadsheet
     * consumers see a stable schema.
     * @param view
     * @param days Lookback window in days. Applies to ``registered-unread`` (staleness cutoff) and ``unregistered-reading`` (read scan window). Ignored by ``bindings-on-retired``.
     * @param limit
     * @param offset
     * @param format
     * @returns any Reconciliation rows. JSON by default; text/csv when ``?format=csv`` is supplied.
     * @throws ApiError
     */
    public static getReconciliationViewTagsReconciliationViewGet(
        view: 'registered-unread' | 'unregistered-reading' | 'bindings-on-retired',
        days: number = 30,
        limit: number = 100,
        offset?: number,
        format?: (string | null),
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tags/reconciliation/{view}',
            path: {
                'view': view,
            },
            query: {
                'days': days,
                'limit': limit,
                'offset': offset,
                'format': format,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Tag By Epc
     * Lookup by canonical EPC hex (case-insensitive in path).
     * @param epcHex
     * @returns TagResponse Successful Response
     * @throws ApiError
     */
    public static getTagByEpcTagsEpcHexGet(
        epcHex: string,
    ): CancelablePromise<TagResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tags/{epc_hex}',
            path: {
                'epc_hex': epcHex,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Tag
     * Hard-delete a tag. Admin only. 409 if still bound to a stock item.
     * @param tagId
     * @returns void
     * @throws ApiError
     */
    public static deleteTagTagsTagIdDelete(
        tagId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/tags/{tag_id}',
            path: {
                'tag_id': tagId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Tag
     * Patch ``status`` and/or ``metadata``.
     *
     * ``epc_hex`` is intentionally absent from :class:`TagUpdate` —
     * it's the natural key. ``batch_id`` / category-style grouping
     * goes through ``POST /tags/{id}/labels`` (per ADR 028 OQ 5).
     * @param tagId
     * @param requestBody
     * @returns TagResponse Successful Response
     * @throws ApiError
     */
    public static updateTagTagsTagIdPatch(
        tagId: string,
        requestBody: TagUpdate,
    ): CancelablePromise<TagResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/tags/{tag_id}',
            path: {
                'tag_id': tagId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
