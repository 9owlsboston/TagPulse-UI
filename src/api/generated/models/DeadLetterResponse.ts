/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Dead-lettered event.
 */
export type DeadLetterResponse = {
    id: string;
    tenant_id: (string | null);
    topic: string;
    payload: Record<string, any>;
    error_message: string;
    retry_count: number;
    status: string;
    failed_at: string;
};

