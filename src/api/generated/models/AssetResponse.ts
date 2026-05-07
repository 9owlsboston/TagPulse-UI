/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LatestTelemetryEntry } from './LatestTelemetryEntry';
/**
 * Persisted asset row.
 */
export type AssetResponse = {
    id: string;
    tenant_id: string;
    external_ref: (string | null);
    name: string;
    asset_type: string;
    status: string;
    parent_asset_id: (string | null);
    metadata?: (Record<string, any> | null);
    created_at: string;
    updated_at: string;
    latest_telemetry?: (Array<LatestTelemetryEntry> | null);
};

