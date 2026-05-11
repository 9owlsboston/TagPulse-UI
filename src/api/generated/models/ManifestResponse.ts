/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ManifestEntry } from './ManifestEntry';
/**
 * GET /assets/{id}/manifest — recursive children of a carrier.
 */
export type ManifestResponse = {
    asset_id: string;
    asset_type: string;
    children?: Array<ManifestEntry>;
    name: string;
};

