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
    asset_label_filters?: null;
    category_ids?: Array<string>;
    condition_config: Record<string, any>;
    condition_type: string;
    confidence_threshold?: (number | string);
    description?: (string | null);
    enabled?: boolean;
    event_type?: (string | null);
    integration_ids?: (Array<string> | null);
    name: string;
    processor?: (string | null);
    scope_device_id?: (string | null);
    site_label_filters?: null;
    trigger?: (string | null);
    zone_label_filters?: null;
};

