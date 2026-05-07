/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type TagDataMappingCreate = {
    scope_kind: TagDataMappingCreate.scope_kind;
    scope_id?: (string | null);
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

