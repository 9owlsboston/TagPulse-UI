/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * One row of the ``asset_current_location`` SQL view.
 *
 * The latest known position for an active asset binding, badged by source
 * (`rfid` for the latest tag-read or one of the ``external_locations.source``
 * strings — e.g. `samsara`, `geotab`, `manual` — for the latest external
 * fix). Whichever side is newer wins.
 */
export type AssetCurrentLocation = {
    asset_id: string;
    recorded_at: string;
    latitude: number;
    longitude: number;
    accuracy_meters: (number | null);
    device_id: (string | null);
    latest_position_source: string;
};

