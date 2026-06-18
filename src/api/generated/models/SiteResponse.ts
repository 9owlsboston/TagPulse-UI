/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CoordSystem } from './CoordSystem';
/**
 * Persisted site row.
 */
export type SiteResponse = {
    address: (string | null);
    city: (string | null);
    coord_system?: (CoordSystem | null);
    country: (string | null);
    created_at: string;
    default_timezone: string;
    id: string;
    kind: SiteResponse.kind;
    latitude: (number | null);
    longitude: (number | null);
    metadata?: (Record<string, any> | null);
    name: string;
    postal_code: (string | null);
    region: (string | null);
    street_line1: (string | null);
    street_line2: (string | null);
    tenant_id: string;
    updated_at: string;
};
export namespace SiteResponse {
    export enum kind {
        SITE = 'site',
        TRANSPORTER = 'transporter',
    }
}

