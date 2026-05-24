/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TagBulkScope } from './TagBulkScope';
/**
 * Body for ``POST /tags/bulk-patch`` (Sprint 50 C4, ADR 028).
 *
 * At least one of ``status`` / ``metadata`` must be set — the
 * server has nothing else to apply otherwise. Per-tag status
 * transitions are validated server-side against the same edge
 * list :class:`TagUpdate` uses, so an operator can't slip
 * ``transferred_out`` past the bulk surface.
 *
 * ``metadata`` is a full **replace** of the target row's
 * metadata column (mirroring single-row PATCH semantics).
 * Per-key merge can be added in a later sprint if customer
 * feedback asks for it; doing replace-by-default avoids
 * surprising "I cleared one key and the others stayed".
 */
export type TagBulkPatchRequest = {
    metadata?: (Record<string, any> | null);
    scope: TagBulkScope;
    status?: ('registered' | 'active' | 'retired' | 'defective' | 'transferred_out' | null);
};

