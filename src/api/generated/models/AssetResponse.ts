/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LatestTelemetryEntry } from './LatestTelemetryEntry';
/**
 * Persisted asset row.
 */
export type AssetResponse = {
    category_id: (string | null);
    created_at: string;
    external_ref: (string | null);
    id: string;
    latest_telemetry?: (Array<LatestTelemetryEntry> | null);
    metadata?: (Record<string, any> | null);
    name: string;
    parent_asset_id: (string | null);
    status: string;
    tenant_id: string;
    updated_at: string;
};

