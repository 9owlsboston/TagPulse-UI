/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Associate a labeled value to an entity.
 *
 * Per ADR 020 §"API path deviation", the caller identifies the
 * label by ``key`` (scoped to the URL's entity_type); the
 * repository looks up the catalog row. A 404 is returned if no
 * matching catalog row exists — there is no auto-create.
 */
export type LabelAssociationCreate = {
    key: string;
    value: string;
};

