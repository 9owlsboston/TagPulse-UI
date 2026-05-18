/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Login-page-facing branding payload. Includes ``name`` so the
 * login UI can fall back gracefully when ``display_name`` is unset.
 */
export type PublicBranding = {
    brand_color?: (string | null);
    display_name?: (string | null);
    logo_url?: (string | null);
    name: string;
    slug: string;
};

