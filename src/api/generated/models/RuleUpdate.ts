/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Partial update for a rule.
 */
export type RuleUpdate = {
    action_config?: (Record<string, any> | null);
    action_type?: (string | null);
    asset_label_filters?: null;
    category_ids?: (Array<string> | null);
    condition_config?: (Record<string, any> | null);
    condition_type?: (string | null);
    confidence_threshold?: (number | string | null);
    description?: (string | null);
    enabled?: (boolean | null);
    event_type?: (string | null);
    integration_ids?: (Array<string> | null);
    name?: (string | null);
    processor?: (string | null);
    scope_device_id?: (string | null);
    site_label_filters?: null;
    trigger?: (string | null);
    zone_label_filters?: null;
};

