/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * One point on an asset's merged movement path.
 *
 * Sourced from either RFID tag reads (`source='rfid'`) or external position
 * fixes (`source` matches the originating ``external_locations.source``).
 * Returned in ascending chronological order.
 */
export type AssetPathPoint = {
    recorded_at: string;
    latitude: number;
    longitude: number;
    accuracy_meters: (number | null);
    source: string;
    device_id?: (string | null);
    tag_read_id?: (string | null);
    external_id?: (string | null);
};

