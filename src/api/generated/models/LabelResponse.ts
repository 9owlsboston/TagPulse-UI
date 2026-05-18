/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Persisted label catalog row.
 */
export type LabelResponse = {
    color: (string | null);
    created_at: string;
    created_by: (string | null);
    entity_type: LabelResponse.entity_type;
    id: string;
    key: string;
    tenant_id: string;
    updated_at: string;
    updated_by: (string | null);
};
export namespace LabelResponse {
    export enum entity_type {
        ASSET = 'asset',
        SITE = 'site',
        ZONE = 'zone',
        DEVICE = 'device',
        CATEGORY = 'category',
    }
}

