/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Integration delivery log entry.
 */
export type DeliveryResponse = {
    attempts: number;
    created_at: string;
    error_message: (string | null);
    event_type: string;
    id: string;
    integration_id: string;
    response_code: (number | null);
    status: string;
};

