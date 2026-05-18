/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Patch a label catalog row.
 *
 * ``entity_type`` is intentionally absent — it is immutable after
 * create per ADR 020. The router separately rejects any smuggled
 * attempt with a 400. Pydantic drops unknown fields by default so
 * a benign omission is silent; the explicit router guard surfaces
 * the policy.
 */
export type LabelUpdate = {
    color?: (string | null);
    key?: (string | null);
};

