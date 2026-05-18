/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * A label-value pair associated to a specific entity.
 *
 * Joins the ``entity_labels`` row with its parent ``labels`` row so
 * the client gets the displayable ``key`` / ``color`` along with the
 * polymorphic ``entity_id`` and the stored ``value``.
 */
export type LabelAssociationResponse = {
    color: (string | null);
    created_at: string;
    created_by: (string | null);
    entity_id: string;
    entity_type: LabelAssociationResponse.entity_type;
    key: string;
    label_id: string;
    value: string;
};
export namespace LabelAssociationResponse {
    export enum entity_type {
        ASSET = 'asset',
        SITE = 'site',
        ZONE = 'zone',
        DEVICE = 'device',
        CATEGORY = 'category',
    }
}

