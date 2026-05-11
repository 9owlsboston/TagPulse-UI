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
    accuracy_meters: (number | null);
    device_id?: (string | null);
    external_id?: (string | null);
    latitude: number;
    longitude: number;
    recorded_at: string;
    source: string;
    tag_read_id?: (string | null);
};

