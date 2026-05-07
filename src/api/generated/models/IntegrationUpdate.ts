/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Partial update for an integration.
 */
export type IntegrationUpdate = {
    name?: (string | null);
    events?: (Array<string> | null);
    config?: (Record<string, any> | null);
    filters?: null;
    enrichments?: (Record<string, string> | null);
    enabled?: (boolean | null);
};

