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
    accuracy_meters: (number | null);
    asset_id: string;
    device_id: (string | null);
    latest_position_source: string;
    latitude: number;
    longitude: number;
    recorded_at: string;
};

