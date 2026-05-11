/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Create a new rule.
 */
export type RuleCreate = {
    action_config: Record<string, any>;
    action_type: string;
    condition_config: Record<string, any>;
    condition_type: string;
    description?: (string | null);
    enabled?: boolean;
    name: string;
    scope_device_id?: (string | null);
};

