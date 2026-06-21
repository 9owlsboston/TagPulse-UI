/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * The resolved per-tenant cold-chain SLA envelope (Sprint 72).
 *
 * Mirrors `tenants.fusion_strategy.sla`; attached to `GET /assets/{id}/state`
 * so the Journey environment chart can draw the target band. Each bound is
 * optional (unbounded on that side).
 */
export type SlaEnvelope = {
    excursion_tolerance_s?: number;
    humidity_max?: (number | null);
    temp_max_c?: (number | null);
    temp_min_c?: (number | null);
};

