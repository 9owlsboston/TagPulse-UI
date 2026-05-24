/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * One per-tag failure from a bulk PATCH / retire dry-run or commit.
 *
 * Currently the only failure surfaced this way is a rejected
 * status transition (e.g., ``transferred_out → retired``).
 * Per ADR 028's all-or-nothing rule on bulk mutations, any
 * non-empty error list aborts the operation — nothing is written
 * even on a confirmed commit.
 */
export type TagBulkRowError = {
    epc_hex: string;
    error: string;
};

