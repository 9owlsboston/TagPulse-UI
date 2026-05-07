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
    tag_id?: (string | null);
    timestamp: string;
    signal_strength?: (number | null);
    sensor_data?: (Record<string, any> | null);
    location?: (Location | null);
    identity?: (Identity | null);
    tag_data?: (Record<string, any> | null);
    reader_antenna?: (number | null);
};

