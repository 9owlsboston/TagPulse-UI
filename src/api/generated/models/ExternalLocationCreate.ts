/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Inbound non-RFID position fix for an asset.
 */
export type ExternalLocationCreate = {
    accuracy_meters?: (number | null);
    heading_deg?: (number | null);
    latitude: number;
    longitude: number;
    metadata?: (Record<string, any> | null);
    recorded_at: string;
    source: string;
    speed_kph?: (number | null);
};

