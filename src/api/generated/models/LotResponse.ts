/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LatestTelemetryEntry } from './LatestTelemetryEntry';
export type LotResponse = {
    id: string;
    tenant_id: string;
    product_id: string;
    lot_code: string;
    manufactured_at: (string | null);
    expires_at: (string | null);
    metadata?: (Record<string, any> | null);
    created_at: string;
    latest_telemetry?: (Array<LatestTelemetryEntry> | null);
};

