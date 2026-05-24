/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Persisted tag registry row.
 */
export type TagResponse = {
    created_at: string;
    epc_hex: string;
    first_seen_at: (string | null);
    gs1_uri: (string | null);
    id: string;
    last_seen_at: (string | null);
    metadata_?: (Record<string, any> | null);
    source: TagResponse.source;
    status: TagResponse.status;
    tenant_id: string;
    updated_at: string;
};
export namespace TagResponse {
    export enum source {
        CSV_IMPORT = 'csv_import',
        API = 'api',
        BACKFILL = 'backfill',
        TRANSFER_IN = 'transfer_in',
    }
    export enum status {
        REGISTERED = 'registered',
        ACTIVE = 'active',
        RETIRED = 'retired',
        DEFECTIVE = 'defective',
        TRANSFERRED_OUT = 'transferred_out',
    }
}

