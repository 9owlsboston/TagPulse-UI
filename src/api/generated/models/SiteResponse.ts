/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Persisted site row.
 */
export type SiteResponse = {
    id: string;
    tenant_id: string;
    name: string;
    address: (string | null);
    default_timezone: string;
    metadata?: (Record<string, any> | null);
    created_at: string;
    updated_at: string;
};

