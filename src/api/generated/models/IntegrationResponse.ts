/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Integration returned from the API.
 */
export type IntegrationResponse = {
    config: Record<string, any>;
    created_at: string;
    enabled: boolean;
    enrichments: (Record<string, string> | null);
    events: Array<string>;
    filters: null;
    health_status: string;
    id: string;
    last_triggered: (string | null);
    name: string;
    status: string;
    tenant_id: string;
    type: string;
    updated_at: string;
};

