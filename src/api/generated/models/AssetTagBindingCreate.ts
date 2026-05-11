/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Bind a tag value to an asset.
 */
export type AssetTagBindingCreate = {
    binding_kind?: AssetTagBindingCreate.binding_kind;
    binding_value: string;
    metadata?: (Record<string, any> | null);
};
export namespace AssetTagBindingCreate {
    export enum binding_kind {
        EPC = 'epc',
        TID = 'tid',
        DEVICE = 'device',
    }
}

