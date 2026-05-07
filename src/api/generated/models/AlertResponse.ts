/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Alert returned from the API.
 */
export type AlertResponse = {
    id: string;
    tenant_id: string;
    rule_id: string;
    device_id: (string | null);
    severity: string;
    message: string;
    context: Record<string, any>;
    status: string;
    triggered_at: string;
};

