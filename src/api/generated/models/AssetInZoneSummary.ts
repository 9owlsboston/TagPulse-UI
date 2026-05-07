/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * One row of `GET /zones/{zone_id}/assets` — assets currently in a zone.
 */
export type AssetInZoneSummary = {
    asset_id: string;
    name: string;
    asset_type: string;
    last_seen_at: string;
    binding_value: string;
    binding_kind: string;
};

