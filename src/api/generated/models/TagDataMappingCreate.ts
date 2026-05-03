/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TagDataMappingCreate = {
    scope_id?: (string | null);
    scope_kind: TagDataMappingCreate.scope_kind;
    semantic_field: string;
    tag_data_key: string;
    transform?: (string | null);
};
export namespace TagDataMappingCreate {
    export enum scope_kind {
        TENANT = 'tenant',
        PRODUCT = 'product',
    }
}

