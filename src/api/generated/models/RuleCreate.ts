/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Create a new rule.
 */
export type RuleCreate = {
    name: string;
    description?: (string | null);
    condition_type: string;
    condition_config: Record<string, any>;
    action_type: string;
    action_config: Record<string, any>;
    scope_device_id?: (string | null);
    enabled?: boolean;
};

