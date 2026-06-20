/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * One row of the ``asset_current_location`` SQL view.
 *
 * The latest known position for an active asset binding, **frame-aware**
 * (Sprint 69): ``kind`` is ``geo`` (lat/lon from the newest RFID lat/lon read
 * or external fix), ``floor`` (computed/precomputed ``(x, y)`` from
 * ``asset_positions``), or ``none`` (seen, but no resolved position).
 * Whichever position frame is newer wins. ``last_seen_at`` is the newest read
 * of **any** kind (incl. fixed-reader reads with no lat/lon), so a floor-only
 * asset reports a real last-seen instead of "never".
 */
export type AssetCurrentLocation = {
    accuracy_meters?: (number | null);
    asset_id: string;
    device_id?: (string | null);
    kind?: string;
    last_seen_at?: (string | null);
    latest_position_source?: (string | null);
    latitude?: (number | null);
    longitude?: (number | null);
    recorded_at?: (string | null);
    site_id?: (string | null);
    'x'?: (number | null);
    'y'?: (number | null);
};

