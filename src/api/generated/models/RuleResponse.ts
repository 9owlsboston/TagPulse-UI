/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Rule returned from the API.
 */
export type RuleResponse = {
    id: string;
    tenant_id: string;
    name: string;
    description: (string | null);
    condition_type: string;
    condition_config: Record<string, any>;
    action_type: string;
    action_config: Record<string, any>;
    scope_device_id: (string | null);
    enabled: boolean;
    created_at: string;
    updated_at: string;
};

