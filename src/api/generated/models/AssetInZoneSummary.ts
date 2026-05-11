/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * One row of `GET /zones/{zone_id}/assets` — assets currently in a zone.
 */
export type AssetInZoneSummary = {
    asset_id: string;
    asset_type: string;
    binding_kind: string;
    binding_value: string;
    last_seen_at: string;
    name: string;
};

