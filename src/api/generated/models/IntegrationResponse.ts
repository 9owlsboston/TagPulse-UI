/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Integration returned from the API.
 */
export type IntegrationResponse = {
    id: string;
    tenant_id: string;
    name: string;
    type: string;
    events: Array<string>;
    config: Record<string, any>;
    enabled: boolean;
    status: string;
    health_status: string;
    filters: null;
    enrichments: (Record<string, string> | null);
    last_triggered: (string | null);
    created_at: string;
    updated_at: string;
};

