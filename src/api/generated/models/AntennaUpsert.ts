/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Set an antenna's position within its device's site coordinate frame.
 *
 * **Port 0 is the reader's nominal location**; ports 1..N are the individual
 * radiators. Coordinates are all optional — an antenna row may exist with
 * just a label before it is surveyed; positioning falls back to port 0 when a
 * radiator has no coordinate.
 */
export type AntennaUpsert = {
    gain_dbi?: (number | null);
    label?: (string | null);
    'x'?: (number | null);
    'y'?: (number | null);
    'z'?: (number | null);
};

