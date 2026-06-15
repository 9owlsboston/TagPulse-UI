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
     * Collapsed-sidebar logo (square icon/mark): an https:// URL or an uploaded base64 data:image/... URL. Falls back to logo_url, then the monogram, when unset.
     */
    logo_collapsed_url?: (string | null);
    /**
     * Full/expanded logo: an https:// URL or an uploaded base64 data:image/... URL. Shown in the expanded sidebar header.
     */
    logo_url?: (string | null);
};

