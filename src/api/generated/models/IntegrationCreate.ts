/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Create an integration target.
 */
export type IntegrationCreate = {
    name: string;
    type: string;
    events: Array<string>;
    config: Record<string, any>;
    filters?: null;
    enrichments?: (Record<string, string> | null);
    enabled?: boolean;
};

