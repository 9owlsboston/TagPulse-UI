/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Integration delivery log entry.
 */
export type DeliveryResponse = {
    id: string;
    integration_id: string;
    event_type: string;
    status: string;
    attempts: number;
    response_code: (number | null);
    error_message: (string | null);
    created_at: string;
};

