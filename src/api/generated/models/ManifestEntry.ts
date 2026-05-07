/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * One node in an asset's containment tree.
 */
export type ManifestEntry = {
    asset_id: string;
    name: string;
    asset_type: string;
    parent_asset_id: (string | null);
    depth: number;
    children?: Array<ManifestEntry>;
};

