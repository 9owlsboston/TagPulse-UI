/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TagBulkScope } from './TagBulkScope';
/**
 * Body for ``POST /tags/bulk-retire`` (Sprint 50 C4, ADR 028).
 *
 * Equivalent to ``POST /tags/bulk-patch`` with ``status='retired'``
 * but exposed as its own endpoint so the audit log carries a
 * distinct action name (``tag.bulk_retired`` vs
 * ``tag.bulk_patched``) — operators searching "who retired
 * batch X" don't have to filter PATCH calls by status payload.
 *
 * ``reason`` is optional free-text recorded on the audit-log
 * entry; not persisted on the tag rows themselves.
 */
export type TagBulkRetireRequest = {
    reason?: (string | null);
    scope: TagBulkScope;
};

