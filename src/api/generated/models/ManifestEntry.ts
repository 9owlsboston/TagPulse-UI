/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * One node in an asset's containment tree.
 */
export type ManifestEntry = {
    asset_id: string;
    children?: Array<ManifestEntry>;
    depth: number;
    name: string;
    parent_asset_id: (string | null);
};

