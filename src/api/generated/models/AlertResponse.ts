/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Alert returned from the API.
 */
export type AlertResponse = {
    context: Record<string, any>;
    device_id: (string | null);
    id: string;
    message: string;
    rule_id: string;
    severity: string;
    status: string;
    tenant_id: string;
    triggered_at: string;
};

