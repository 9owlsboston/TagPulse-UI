/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Create a label catalog row.
 */
export type LabelCreate = {
    color?: (string | null);
    entity_type: LabelCreate.entity_type;
    key: string;
};
export namespace LabelCreate {
    export enum entity_type {
        ASSET = 'asset',
        SITE = 'site',
        ZONE = 'zone',
        DEVICE = 'device',
        CATEGORY = 'category',
        TAG = 'tag',
    }
}

