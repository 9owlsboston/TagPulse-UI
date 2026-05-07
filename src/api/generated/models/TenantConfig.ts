/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Read-only view of tenant-scoped feature flags.
 */
export type TenantConfig = {
    id: string;
    name: string;
    slug: string;
    plan: string;
    tracking_modes: Array<'asset' | 'inventory'>;
    telemetry_subject_kinds?: Array<'device' | 'asset' | 'lot' | 'stock_item' | 'zone'>;
    rate_limit_overrides?: (Record<string, number> | null);
};

