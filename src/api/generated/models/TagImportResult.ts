/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TagImportRowError } from './TagImportRowError';
/**
 * Outcome of ``POST /tags/import`` (Sprint 50 C1/C2/C3).
 *
 * Five branches the client must distinguish:
 *
 * - ``errors`` non-empty → 422; the CSV was rejected, nothing was
 * written, ``rows_created`` and ``rows_skipped`` are both 0.
 * ``token`` is null (the ADR 028 governance rule binds the token
 * to a *valid* preview only).
 * - ``dry_run=True`` and ``errors`` empty → 200; the CSV would
 * have created ``rows_created`` rows. No rows were written.
 * ``token``, ``expires_in``, and ``sample`` are populated so the
 * operator can re-submit with ``?confirm=<token>``.
 * - ``dry_run=False`` and ``confirm`` provided and ``errors``
 * empty and ``rows_total`` < tenant threshold → 201; the CSV was
 * written. ``rows_created`` + ``rows_skipped`` = ``rows_total``;
 * ``rows_skipped`` counts EPCs that already existed for the
 * tenant (treated as idempotent, not as errors). ``token``
 * echoes the consumed token for audit traceability.
 * - ``dry_run=False`` and ``confirm`` provided and ``errors``
 * empty and ``rows_total`` >= tenant threshold → **202**; the
 * CSV is *queued* for second-admin approval per ADR 028
 * §Governance #4. ``requires_approval=True`` and ``pending_id``
 * is set; ``rows_created`` / ``rows_skipped`` are 0 (nothing
 * written yet). The second admin completes the op via
 * ``POST /bulk-operations/{pending_id}/approve``.
 * - A bad token (mismatched CSV, wrong tenant/user, expired)
 * surfaces as 409 from the route, not via this schema.
 *
 * Per ADR 028 §"Governance" rule 2, ``confirm`` and ``dry_run`` are
 * mutually exclusive and at least one must be set — the route
 * rejects "bare" submits (no dry-run, no confirm) with 400.
 */
export type TagImportResult = {
    dry_run: boolean;
    errors?: Array<TagImportRowError>;
    expires_in?: (number | null);
    pending_id?: (string | null);
    requires_approval?: (boolean | null);
    rows_created: number;
    rows_skipped: number;
    rows_total: number;
    sample?: (Array<string> | null);
    token?: (string | null);
};

