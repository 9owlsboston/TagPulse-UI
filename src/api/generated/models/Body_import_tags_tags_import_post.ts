/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Body_import_tags_tags_import_post = {
    /**
     * CSV with required column 'epc_hex'. Extra columns are ignored. Max 10 000 rows per import (413 above). Max 10 imports/hour per tenant (configurable via tenants.tag_bulk_import_rate_limit).
     */
    upload: string;
};

