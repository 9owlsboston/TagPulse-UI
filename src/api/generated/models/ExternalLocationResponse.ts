/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Persisted external_locations row.
 */
export type ExternalLocationResponse = {
    id: string;
    tenant_id: string;
    asset_id: string;
    recorded_at: string;
    latitude: number;
    longitude: number;
    source: string;
    accuracy_meters: (number | null);
    speed_kph: (number | null);
    heading_deg: (number | null);
    metadata?: (Record<string, any> | null);
};

