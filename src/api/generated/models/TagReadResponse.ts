/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Tag read event returned from the API.
 */
export type TagReadResponse = {
    id: string;
    device_id: string;
    tag_id: string;
    timestamp: string;
    signal_strength: (number | null);
    sensor_data: (Record<string, any> | null);
    latitude?: (number | null);
    longitude?: (number | null);
    location_accuracy_m?: (number | null);
    location_source?: (string | null);
    epc?: (string | null);
    epc_hex?: (string | null);
    epc_scheme?: (string | null);
    epc_decoded?: (Record<string, any> | null);
    tid?: (string | null);
    user_memory_hex?: (string | null);
    tag_data?: (Record<string, any> | null);
    reader_antenna?: (number | null);
    created_at: string;
};

