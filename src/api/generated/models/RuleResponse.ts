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
    asset_label_filters?: null;
    category_ids?: Array<string>;
    condition_config: Record<string, any>;
    condition_type: string;
    confidence_threshold?: string;
    created_at: string;
    description: (string | null);
    enabled: boolean;
    event_type?: (string | null);
    id: string;
    integration_ids?: (Array<string> | null);
    kind?: RuleResponse.kind;
    name: string;
    processor?: (string | null);
    scope_device_id: (string | null);
    site_label_filters?: null;
    tenant_id: string;
    trigger?: (string | null);
    updated_at: string;
    zone_label_filters?: null;
};
export namespace RuleResponse {
    export enum kind {
        LEGACY = 'legacy',
        SIGNALING = 'signaling',
    }
}

