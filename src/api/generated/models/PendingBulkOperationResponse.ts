/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Persisted ``pending_bulk_operations`` row (ADR 028 §Governance #4).
 *
 * Surfaced on:
 *
 * - the **202** branch of ``POST /tags/import`` (via the
 * ``pending_id`` field on :class:`TagImportResult`) — operator A
 * learns "your import is queued for approval, here is the id";
 * - ``GET /bulk-operations/{id}`` — operator B fetches the record
 * they're being asked to approve;
 * - ``POST /bulk-operations/{id}/approve`` and ``/reject`` —
 * the response echoes the updated row.
 *
 * The CSV bytes themselves (``payload``) are deliberately **not**
 * exposed — operator B sees ``row_count`` + ``sample`` (the same
 * 10-EPC preview operator A saw on dry-run) which is the
 * intended review surface. ``content_hash`` is exposed for
 * cross-system verification.
 */
export type PendingBulkOperationResponse = {
    content_hash: string;
    created_at: string;
    decided_at: (string | null);
    decided_by: (string | null);
    executed_at: (string | null);
    expires_at: string;
    id: string;
    operation: string;
    request_id: (string | null);
    requested_by: (string | null);
    row_count: number;
    sample: Array<string>;
    status: string;
    tenant_id: string;
};

