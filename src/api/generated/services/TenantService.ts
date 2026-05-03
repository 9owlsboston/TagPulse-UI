/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MapConfigResponse } from '../models/MapConfigResponse';
import type { TenantConfig } from '../models/TenantConfig';
import type { TenantConfigUpdate } from '../models/TenantConfigUpdate';
import type { TileProviderUpdate } from '../models/TileProviderUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TenantService {
    /**
     * Get Tenant Config
     * Return the calling tenant's configuration (any role).
     * @returns TenantConfig Successful Response
     * @throws ApiError
     */
    public static getTenantConfigTenantConfigGet(): CancelablePromise<TenantConfig> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tenant/config',
        });
    }
    /**
     * Update Tenant Config
     * Update tenant feature flags (admin only). Deduplicated and audited.
     * @param requestBody
     * @returns TenantConfig Successful Response
     * @throws ApiError
     */
    public static updateTenantConfigTenantConfigPatch(
        requestBody: TenantConfigUpdate,
    ): CancelablePromise<TenantConfig> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/tenant/config',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Map Config
     * Resolved tile-provider config for the calling tenant (any role).
     * @returns MapConfigResponse Successful Response
     * @throws ApiError
     */
    public static getMapConfigTenantMapConfigGet(): CancelablePromise<MapConfigResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tenant/map-config',
        });
    }
    /**
     * Update Map Config
     * Set the tile provider for the calling tenant (admin only).
     * @param requestBody
     * @returns MapConfigResponse Successful Response
     * @throws ApiError
     */
    public static updateMapConfigTenantMapConfigPatch(
        requestBody: TileProviderUpdate,
    ): CancelablePromise<MapConfigResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/tenant/map-config',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
