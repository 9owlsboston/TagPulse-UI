/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TagBulkRowError } from './TagBulkRowError';
/**
 * Outcome of ``POST /tags/bulk-patch`` or ``POST /tags/bulk-retire``.
 *
 * Five branches mirroring :class:`TagImportResult`:
 *
 * - ``errors`` non-empty → **422**; the scope resolved but at
 * least one matched tag would violate its status-transition
 * edge list. Nothing is written. No token is minted.
 * - ``dry_run=True`` and ``errors`` empty → **200**; ``matched``
 * is the number of tags the scope resolved to, ``updated`` is
 * 0 (nothing written), ``token`` + ``expires_in`` + ``sample``
 * are populated for a follow-up ``?confirm=<token>``.
 * - ``dry_run=False`` and ``confirm`` provided and ``matched``
 * below tenant threshold → **200**; ``updated`` is the number
 * of rows changed.
 * - ``dry_run=False`` and ``confirm`` provided and ``matched``
 * at or above tenant threshold → **202**; the op is queued
 * for second-admin approval. ``requires_approval=True``,
 * ``pending_id`` is set, ``updated=0``.
 * - Bad token surfaces as 409 from the route, not via this
 * schema.
 */
export type TagBulkOperationResult = {
    dry_run: boolean;
    errors?: Array<TagBulkRowError>;
    expires_in?: (number | null);
    matched: number;
    pending_id?: (string | null);
    request_id?: (string | null);
    requires_approval?: (boolean | null);
    sample?: Array<string>;
    token?: (string | null);
    updated: number;
};

