/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LocationDescriptor } from './LocationDescriptor';
/**
 * Tag read event returned from the API.
 */
export type TagReadResponse = {
    created_at: string;
    device_id: string;
    epc?: (string | null);
    epc_decoded?: (Record<string, any> | null);
    epc_hex?: (string | null);
    epc_scheme?: (string | null);
    id: string;
    latitude?: (number | null);
    location?: (LocationDescriptor | null);
    location_accuracy_m?: (number | null);
    location_source?: (string | null);
    longitude?: (number | null);
    reader_antenna?: (number | null);
    sensor_data: (Record<string, any> | null);
    signal_strength: (number | null);
    tag_data?: (Record<string, any> | null);
    tag_id: string;
    tid?: (string | null);
    timestamp: string;
    user_memory_hex?: (string | null);
};

