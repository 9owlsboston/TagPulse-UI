/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Create one tag registry row (Phase B, single-row path).
 *
 * ``source`` is constrained to operator-driven values — ``transfer_in``
 * is reserved for the transfer-completion path that writes the row
 * server-side, not via this endpoint.
 */
export type TagCreate = {
    epc_hex: string;
    metadata?: (Record<string, any> | null);
    source?: TagCreate.source;
};
export namespace TagCreate {
    export enum source {
        CSV_IMPORT = 'csv_import',
        API = 'api',
        BACKFILL = 'backfill',
    }
}

