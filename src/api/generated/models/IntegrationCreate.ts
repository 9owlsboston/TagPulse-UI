/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Create an integration target.
 */
export type IntegrationCreate = {
    config: Record<string, any>;
    enabled?: boolean;
    enrichments?: (Record<string, string> | null);
    events: Array<string>;
    filters?: null;
    name: string;
    type: string;
};

