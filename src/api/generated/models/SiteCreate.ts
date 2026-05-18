/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Create a site.
 */
export type SiteCreate = {
    address?: (string | null);
    city?: (string | null);
    country?: (string | null);
    default_timezone?: string;
    kind?: SiteCreate.kind;
    latitude?: (number | null);
    longitude?: (number | null);
    metadata?: (Record<string, any> | null);
    name: string;
    postal_code?: (string | null);
    region?: (string | null);
    street_line1?: (string | null);
    street_line2?: (string | null);
};
export namespace SiteCreate {
    export enum kind {
        SITE = 'site',
        TRANSPORTER = 'transporter',
    }
}

