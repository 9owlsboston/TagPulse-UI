/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Per-page list-column config (ADR-030 surface).
 *
 * ``advanced`` is the key move for the TID / ``metadata``-JSONB ask: those
 * columns are default-OFF, revealed by an "Advanced columns" toggle. This is
 * *default-hidden*, never deletion — the field still exists in the API and
 * exports (ADR-032 §4, §6.3).
 */
export type ColumnGroup = {
    advanced?: Array<string>;
    hidden?: Array<string>;
    order?: Array<string>;
};

