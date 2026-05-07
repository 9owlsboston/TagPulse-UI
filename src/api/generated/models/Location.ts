/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Optional location attached to a tag read or sent on the location topic.
 */
export type Location = {
    latitude: number;
    longitude: number;
    accuracy_m?: (number | null);
    source?: Location.source;
};
export namespace Location {
    export enum source {
        GPS = 'gps',
        FIXED = 'fixed',
        INFERRED = 'inferred',
    }
}

