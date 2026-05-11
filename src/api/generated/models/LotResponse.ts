/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LatestTelemetryEntry } from './LatestTelemetryEntry';
export type LotResponse = {
    created_at: string;
    expires_at: (string | null);
    id: string;
    latest_telemetry?: (Array<LatestTelemetryEntry> | null);
    lot_code: string;
    manufactured_at: (string | null);
    metadata?: (Record<string, any> | null);
    product_id: string;
    tenant_id: string;
};

