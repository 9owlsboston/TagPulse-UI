/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Identity } from './Identity';
import type { Location } from './Location';
/**
 * Incoming tag read event — used by both HTTP and MQTT ingestion paths.
 */
export type TagReadCreate = {
    device_id: string;
    identity?: (Identity | null);
    location?: (Location | null);
    reader_antenna?: (number | null);
    sensor_data?: (Record<string, any> | null);
    signal_strength?: (number | null);
    tag_data?: (Record<string, any> | null);
    tag_id?: (string | null);
    timestamp: string;
};

