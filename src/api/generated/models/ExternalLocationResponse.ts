/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Persisted external_locations row.
 */
export type ExternalLocationResponse = {
    accuracy_meters: (number | null);
    asset_id: string;
    heading_deg: (number | null);
    id: string;
    latitude: number;
    longitude: number;
    metadata?: (Record<string, any> | null);
    recorded_at: string;
    source: string;
    speed_kph: (number | null);
    tenant_id: string;
};

