/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Per-tenant branding overrides. ``None`` on any field means
 * "no override; UI uses the system default".
 */
export type TenantBranding = {
    /**
     * Primary brand colour as #RRGGBB hex.
     */
    brand_color?: (string | null);
    /**
     * Friendly name shown in the Sider/login in place of tenants.name.
     */
    display_name?: (string | null);
    /**
     * HTTPS URL to the logo image hosted by the operator.
     */
    logo_url?: (string | null);
};

