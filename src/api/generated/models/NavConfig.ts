/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Sidebar/nav section visibility + ordering + item placement (the menu).
 *
 * ``hidden`` / ``order`` restrict + reorder within the existing hierarchy.
 * ``placement`` (Sprint 61) relocates a *movable* item (``MOVABLE_ITEMS``) to
 * one of its enumerated candidate parents — the one capability hide/order
 * can't express. A placement entry is validated against the registry: the
 * item must be movable and the chosen parent one of its candidates, else
 * ``ValidationError`` → 422. Each movable item still renders in exactly one
 * parent (its resolved placement → default), so mutual exclusion is structural.
 */
export type NavConfig = {
    hidden?: Array<string>;
    order?: Array<string>;
    placement?: Record<string, string>;
};

