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
    plan: string;
    rate_limit_overrides?: (Record<string, number> | null);
    slug: string;
    telemetry_subject_kinds?: Array<'device' | 'asset' | 'lot' | 'stock_item' | 'zone'>;
    tracking_modes: Array<'asset' | 'inventory'>;
};

