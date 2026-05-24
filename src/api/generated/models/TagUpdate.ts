/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Patch a tag registry row.
 *
 * Only ``status`` and ``metadata`` are operator-mutable here. The
 * ADR-028 status-transition rules are enforced in the service
 * layer; the schema accepts the full enum so an admin can flip
 * ``registered`` / ``active`` → ``retired`` / ``defective``. The
 * registrar worker is the only writer that may set ``active`` and
 * the transfer flow is the only writer that may set
 * ``transferred_out`` — both rejected here in the service layer.
 *
 * ``epc_hex`` is immutable (it's the natural key). ``source``,
 * ``first_seen_at``, ``last_seen_at``, ``gs1_uri`` are all
 * system-owned. There is intentionally no ``batch_id`` field —
 * batch grouping goes through the ``entity_labels`` API per
 * ADR 028 OQ 5.
 */
export type TagUpdate = {
    metadata?: (Record<string, any> | null);
    status?: ('registered' | 'active' | 'retired' | 'defective' | 'transferred_out' | null);
};

