/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CoordSystem } from './CoordSystem';
/**
 * Patch a site.
 *
 * All fields optional. ``kind`` is mutable (a transporter that becomes
 * permanently parked can be reclassified as a site, and vice-versa).
 *
 * Geolocation paired-validation only fires when *both* fields appear
 * in the patch payload — the underlying DB CHECK enforces the
 * invariant at write time for partial updates.
 *
 * Fields backed by NOT-NULL DB columns (``name``, ``kind``,
 * ``default_timezone``) are ``Optional`` only for *omission* from the
 * patch payload. Explicit ``null`` for any of them is rejected at
 * 422 so the DB never sees the NULL and returns 500.
 */
export type SiteUpdate = {
    address?: (string | null);
    city?: (string | null);
    coord_system?: (CoordSystem | null);
    country?: (string | null);
    default_timezone?: (string | null);
    kind?: ('site' | 'transporter' | null);
    latitude?: (number | null);
    longitude?: (number | null);
    metadata?: (Record<string, any> | null);
    name?: (string | null);
    postal_code?: (string | null);
    region?: (string | null);
    street_line1?: (string | null);
    street_line2?: (string | null);
};

