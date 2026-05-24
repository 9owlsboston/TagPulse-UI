/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Persisted tag_transfer row (one EPC of a request).
 */
export type TagTransferResponse = {
    completed_at: (string | null);
    epc_hex: string;
    failure_reason: (string | null);
    from_tenant_id: string;
    id: string;
    request_id: string;
    requested_at: string;
    requested_by: string;
    status: TagTransferResponse.status;
    to_tenant_id: string;
};
export namespace TagTransferResponse {
    export enum status {
        REQUESTED = 'requested',
        COMPLETED = 'completed',
        FAILED = 'failed',
    }
}

