/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * One invalid CSV row from ``POST /tags/import`` (Sprint 50 C1).
 *
 * Returned to the client as part of :class:`TagImportResult` when
 * any row fails validation; per ADR 028 OQ 4 the import is
 * all-or-nothing, so a non-empty ``errors`` list means *nothing*
 * was written (regardless of ``dry_run``).
 *
 * ``row`` is the 1-based CSV row number *after* the header
 * (matching what spreadsheet users see). ``epc_hex`` is the
 * operator-supplied value, echoed back unmodified so they can
 * grep their CSV; it's omitted only if the row had no ``epc_hex``
 * column value at all.
 */
export type TagImportRowError = {
    epc_hex?: (string | null);
    error: string;
    row: number;
};

