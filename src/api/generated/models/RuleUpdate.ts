/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Partial update for a rule.
 */
export type RuleUpdate = {
    name?: (string | null);
    description?: (string | null);
    condition_type?: (string | null);
    condition_config?: (Record<string, any> | null);
    action_type?: (string | null);
    action_config?: (Record<string, any> | null);
    scope_device_id?: (string | null);
    enabled?: (boolean | null);
};

