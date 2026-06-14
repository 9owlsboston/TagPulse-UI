/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * A default sort for a list page (ADR-030 sort-by-header default).
 */
export type SortSpec = {
    dir?: SortSpec.dir;
    key: string;
};
export namespace SortSpec {
    export enum dir {
        ASC = 'asc',
        DESC = 'desc',
    }
}

