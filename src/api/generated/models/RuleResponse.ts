/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Rule returned from the API.
 */
export type RuleResponse = {
    action_config: Record<string, any>;
    action_type: string;
    condition_config: Record<string, any>;
    condition_type: string;
    created_at: string;
    description: (string | null);
    enabled: boolean;
    id: string;
    name: string;
    scope_device_id: (string | null);
    tenant_id: string;
    updated_at: string;
};

