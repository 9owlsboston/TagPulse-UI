/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Patch a category.
 *
 * ``category_type`` is intentionally absent — it is immutable after
 * create per ADR 019. Attempts to send it must be rejected by the
 * API layer (Pydantic will silently drop it without ``model_extra``
 * enabled, so we surface a 400 there instead).
 */
export type CategoryUpdate = {
    description?: (string | null);
    name?: (string | null);
    required_tags?: (number | null);
    sku_upc?: (string | null);
};

