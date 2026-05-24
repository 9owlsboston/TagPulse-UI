/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Initiate a cross-tenant transfer of one or more EPCs.
 *
 * All EPCs in one request share a server-generated ``request_id``.
 * The receiving tenant is identified by slug. Phase B creates rows
 * in ``status='requested'`` only — the acknowledgement /
 * completion path lands in a later phase.
 */
export type TagTransferRequest = {
    epcs: Array<string>;
    to_tenant_slug: string;
};

