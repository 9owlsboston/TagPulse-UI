/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Inbound non-RFID position fix for an asset.
 */
export type ExternalLocationCreate = {
    latitude: number;
    longitude: number;
    recorded_at: string;
    source: string;
    accuracy_meters?: (number | null);
    speed_kph?: (number | null);
    heading_deg?: (number | null);
    metadata?: (Record<string, any> | null);
};

