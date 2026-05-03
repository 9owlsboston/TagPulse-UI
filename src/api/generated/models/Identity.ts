/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Optional RFID identity payload (EPC / TID / user memory).
 */
export type Identity = {
    epc?: (string | null);
    epc_decoded?: (Record<string, any> | null);
    epc_hex?: (string | null);
    epc_scheme?: (string | null);
    tid?: (string | null);
    user_memory_hex?: (string | null);
};

