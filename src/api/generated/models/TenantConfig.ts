/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FusionStrategy } from './FusionStrategy';
/**
 * Read-only view of tenant-scoped feature flags.
 */
export type TenantConfig = {
    dashboard_tags_count_mode?: TenantConfig.dashboard_tags_count_mode;
    fusion_strategy?: (FusionStrategy | null);
    id: string;
    low_stock_threshold?: number;
    name: string;
    plan: string;
    rate_limit_overrides?: (Record<string, number> | null);
    slug: string;
    telemetry_subject_kinds?: Array<'device' | 'asset' | 'lot' | 'stock_item' | 'zone'>;
    tracking_modes: Array<'asset' | 'inventory'>;
};
export namespace TenantConfig {
    export enum dashboard_tags_count_mode {
        ALL = 'all',
        LIVE = 'live',
        NON_TERMINAL = 'non_terminal',
    }
}

