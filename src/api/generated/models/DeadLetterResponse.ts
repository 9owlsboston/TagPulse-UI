/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Dead-lettered event.
 */
export type DeadLetterResponse = {
    error_message: string;
    failed_at: string;
    id: string;
    payload: Record<string, any>;
    retry_count: number;
    status: string;
    tenant_id: (string | null);
    topic: string;
};

