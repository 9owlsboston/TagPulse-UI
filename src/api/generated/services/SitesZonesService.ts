/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AssetInZoneSummary } from '../models/AssetInZoneSummary';
import type { SiteCreate } from '../models/SiteCreate';
import type { SiteResponse } from '../models/SiteResponse';
import type { SiteUpdate } from '../models/SiteUpdate';
import type { ZoneCreate } from '../models/ZoneCreate';
import type { ZoneResponse } from '../models/ZoneResponse';
import type { ZoneUpdate } from '../models/ZoneUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SitesZonesService {
    /**
     * Create Site
     * @param requestBody
     * @returns SiteResponse Successful Response
     * @throws ApiError
     */
    public static createSiteSitesPost(
        requestBody: SiteCreate,
    ): CancelablePromise<SiteResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/sites',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Sites
     * @param limit
     * @param offset
     * @returns SiteResponse Successful Response
     * @throws ApiError
     */
    public static listSitesSitesGet(
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<Array<SiteResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/sites',
            query: {
                'limit': limit,
                'offset': offset,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Site
     * @param siteId
     * @returns SiteResponse Successful Response
     * @throws ApiError
     */
    public static getSiteSitesSiteIdGet(
        siteId: string,
    ): CancelablePromise<SiteResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/sites/{site_id}',
            path: {
                'site_id': siteId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Site
     * @param siteId
     * @param requestBody
     * @returns SiteResponse Successful Response
     * @throws ApiError
     */
    public static updateSiteSitesSiteIdPatch(
        siteId: string,
        requestBody: SiteUpdate,
    ): CancelablePromise<SiteResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/sites/{site_id}',
            path: {
                'site_id': siteId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Site
     * @param siteId
     * @returns void
     * @throws ApiError
     */
    public static deleteSiteSitesSiteIdDelete(
        siteId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/sites/{site_id}',
            path: {
                'site_id': siteId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Zone
     * @param requestBody
     * @returns ZoneResponse Successful Response
     * @throws ApiError
     */
    public static createZoneZonesPost(
        requestBody: ZoneCreate,
    ): CancelablePromise<ZoneResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/zones',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Zones
     * @param siteId
     * @param limit
     * @param offset
     * @returns ZoneResponse Successful Response
     * @throws ApiError
     */
    public static listZonesZonesGet(
        siteId?: (string | null),
        limit: number = 200,
        offset?: number,
    ): CancelablePromise<Array<ZoneResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/zones',
            query: {
                'site_id': siteId,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Zone
     * @param zoneId
     * @returns ZoneResponse Successful Response
     * @throws ApiError
     */
    public static getZoneZonesZoneIdGet(
        zoneId: string,
    ): CancelablePromise<ZoneResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/zones/{zone_id}',
            path: {
                'zone_id': zoneId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Zone
     * @param zoneId
     * @param requestBody
     * @returns ZoneResponse Successful Response
     * @throws ApiError
     */
    public static updateZoneZonesZoneIdPatch(
        zoneId: string,
        requestBody: ZoneUpdate,
    ): CancelablePromise<ZoneResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/zones/{zone_id}',
            path: {
                'zone_id': zoneId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Zone
     * @param zoneId
     * @returns void
     * @throws ApiError
     */
    public static deleteZoneZonesZoneIdDelete(
        zoneId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/zones/{zone_id}',
            path: {
                'zone_id': zoneId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Assets In Zone
     * Assets currently in the zone (latest tag-read reader matches the zone).
     * @param zoneId
     * @param limit
     * @param offset
     * @returns AssetInZoneSummary Successful Response
     * @throws ApiError
     */
    public static listAssetsInZoneZonesZoneIdAssetsGet(
        zoneId: string,
        limit: number = 200,
        offset?: number,
    ): CancelablePromise<Array<AssetInZoneSummary>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/zones/{zone_id}/assets',
            path: {
                'zone_id': zoneId,
            },
            query: {
                'limit': limit,
                'offset': offset,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
