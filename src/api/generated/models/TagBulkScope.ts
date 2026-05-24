/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Scope selector for a bulk PATCH or bulk retire.
 *
 * Per ADR 028 §Governance #3 every bulk mutation MUST carry one of:
 *
 * - ``labels`` — deep-object label filter; MUST include a non-empty
 * ``batch`` key (other label keys may be present and are
 * AND-combined). This is the "operators think in batches"
 * contract — bulk ops scoped purely by some other label key
 * would be hard to audit by reel.
 * - ``epc_list`` — explicit list of 1..1000 canonical EPC hex
 * values. The 1000 cap is the ADR-pinned blast-radius limit
 * for the explicit-enumeration shape.
 *
 * Exactly one of ``labels`` / ``epc_list`` must be set.
 */
export type TagBulkScope = {
    epc_list?: (Array<string> | null);
    labels?: (Record<string, string> | null);
};

