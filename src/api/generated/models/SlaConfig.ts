/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Per-tenant cold-chain envelope used to score transit legs (Sprint 72).
 *
 * A reading is in-range when ``temp_min_c ≤ temperature ≤ temp_max_c`` and
 * ``humidity ≤ humidity_max`` (each bound optional → unbounded on that side).
 * ``excursion_tolerance_s`` is the longest contiguous out-of-range run allowed
 * before a leg is flagged ``sla_breached``.
 */
export type SlaConfig = {
    excursion_tolerance_s?: number;
    humidity_max?: (number | null);
    temp_max_c?: (number | null);
    temp_min_c?: (number | null);
};

