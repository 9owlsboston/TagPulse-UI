/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * One transit leg — the ``geo``-frame interval between two facilities (Sprint 72).
 *
 * ``status`` is ``open`` (in transit; ``dest_*``/``arrived_at`` + SLA null) or
 * ``closed`` (arrived; envelope + SLA computed). The cold-chain summary
 * (``temp_*``/``humidity_*``/``excursion_s``/``in_range_pct``/``sla_breached``)
 * is populated on close per the tenant SLA.
 */
export type AssetLegResponse = {
    arrived_at?: (string | null);
    asset_id: string;
    departed_at: string;
    dest_site_id?: (string | null);
    dest_zone_id?: (string | null);
    excursion_s?: (number | null);
    humidity_max?: (number | null);
    humidity_min?: (number | null);
    id: string;
    in_range_pct?: (number | null);
    last_lat?: (number | null);
    last_lon?: (number | null);
    origin_site_id?: (string | null);
    origin_zone_id?: (string | null);
    sla_breached?: (boolean | null);
    status: string;
    temp_max_c?: (number | null);
    temp_mean_c?: (number | null);
    temp_min_c?: (number | null);
};

