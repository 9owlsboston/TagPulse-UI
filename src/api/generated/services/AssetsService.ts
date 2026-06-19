/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AssetCreate } from '../models/AssetCreate';
import type { AssetCurrentLocation } from '../models/AssetCurrentLocation';
import type { AssetLoadRequest } from '../models/AssetLoadRequest';
import type { AssetPathPoint } from '../models/AssetPathPoint';
import type { AssetResponse } from '../models/AssetResponse';
import type { AssetTagBindingCreate } from '../models/AssetTagBindingCreate';
import type { AssetTagBindingResponse } from '../models/AssetTagBindingResponse';
import type { AssetUnloadRequest } from '../models/AssetUnloadRequest';
import type { AssetUpdate } from '../models/AssetUpdate';
import type { ExternalLocationCreate } from '../models/ExternalLocationCreate';
import type { ExternalLocationResponse } from '../models/ExternalLocationResponse';
import type { FloorPositionCreate } from '../models/FloorPositionCreate';
import type { FloorPositionResponse } from '../models/FloorPositionResponse';
import type { ManifestResponse } from '../models/ManifestResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AssetsService {
    /**
     * List Assets
     * @param status
     * @param categoryId Sprint 37 — server-side filter on the ``assets.category_id`` FK (ADR 019). Combines with ``status``/``q``/``labels[…]`` via AND. Kept for backwards compatibility; prefer ``?category_ids=`` (Sprint 42 — multi-select). When both are supplied the union is used (OR across categories).
     * @param categoryIds Sprint 42 — server-side multi-category filter on ``assets.category_id``. Pass multiple values as repeated query params (``?category_ids=A&category_ids=B``) for OR semantics across categories. Combines with ``status``/``q``/``labels[…]`` via AND. Supersedes singular ``?category_id=``; the union of both is used when supplied together.
     * @param q
     * @param limit
     * @param offset
     * @returns AssetResponse Successful Response
     * @throws ApiError
     */
    public static listAssetsAssetsGet(
        status?: (string | null),
        categoryId?: (string | null),
        categoryIds?: (Array<string> | null),
        q?: (string | null),
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<Array<AssetResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/assets',
            query: {
                'status': status,
                'category_id': categoryId,
                'category_ids': categoryIds,
                'q': q,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Asset
     * @param requestBody
     * @returns AssetResponse Successful Response
     * @throws ApiError
     */
    public static createAssetAssetsPost(
        requestBody: AssetCreate,
    ): CancelablePromise<AssetResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/assets',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Assets Current Locations
     * Bulk current-location feed for the Assets list page.
     *
     * One row per asset that has *any* known position (RFID or external),
     * ordered newest-first. Powers the live Last-seen / Location columns
     * without N+1 fetches.
     * @param limit
     * @param offset
     * @returns AssetCurrentLocation Successful Response
     * @throws ApiError
     */
    public static listAssetsCurrentLocationsAssetsCurrentLocationsGet(
        limit: number = 200,
        offset?: number,
    ): CancelablePromise<Array<AssetCurrentLocation>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/assets/current-locations',
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
     * Retire Asset
     * Soft-delete: marks status='retired'.
     * @param assetId
     * @returns void
     * @throws ApiError
     */
    public static retireAssetAssetsAssetIdDelete(
        assetId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/assets/{asset_id}',
            path: {
                'asset_id': assetId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Asset
     * @param assetId
     * @returns AssetResponse Successful Response
     * @throws ApiError
     */
    public static getAssetAssetsAssetIdGet(
        assetId: string,
    ): CancelablePromise<AssetResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/assets/{asset_id}',
            path: {
                'asset_id': assetId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Asset
     * @param assetId
     * @param requestBody
     * @returns AssetResponse Successful Response
     * @throws ApiError
     */
    public static updateAssetAssetsAssetIdPatch(
        assetId: string,
        requestBody: AssetUpdate,
    ): CancelablePromise<AssetResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/assets/{asset_id}',
            path: {
                'asset_id': assetId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Bindings
     * @param assetId
     * @param activeOnly
     * @returns AssetTagBindingResponse Successful Response
     * @throws ApiError
     */
    public static listBindingsAssetsAssetIdBindingsGet(
        assetId: string,
        activeOnly: boolean = false,
    ): CancelablePromise<Array<AssetTagBindingResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/assets/{asset_id}/bindings',
            path: {
                'asset_id': assetId,
            },
            query: {
                'active_only': activeOnly,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Bind Tag
     * @param assetId
     * @param requestBody
     * @returns AssetTagBindingResponse Successful Response
     * @throws ApiError
     */
    public static bindTagAssetsAssetIdBindingsPost(
        assetId: string,
        requestBody: AssetTagBindingCreate,
    ): CancelablePromise<AssetTagBindingResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/assets/{asset_id}/bindings',
            path: {
                'asset_id': assetId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Unbind Tag
     * @param assetId
     * @param bindingValue
     * @returns void
     * @throws ApiError
     */
    public static unbindTagAssetsAssetIdBindingsBindingValueDelete(
        assetId: string,
        bindingValue: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/assets/{asset_id}/bindings/{binding_value}',
            path: {
                'asset_id': assetId,
                'binding_value': bindingValue,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Asset Current Location
     * Latest known position for the asset, sourced from RFID or external feeds.
     * @param assetId
     * @returns AssetCurrentLocation Successful Response
     * @throws ApiError
     */
    public static getAssetCurrentLocationAssetsAssetIdCurrentLocationGet(
        assetId: string,
    ): CancelablePromise<AssetCurrentLocation> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/assets/{asset_id}/current-location',
            path: {
                'asset_id': assetId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Record External Position
     * Record a non-RFID position fix (TMS push, manual check-in, etc.).
     * @param assetId
     * @param requestBody
     * @returns ExternalLocationResponse Successful Response
     * @throws ApiError
     */
    public static recordExternalPositionAssetsAssetIdExternalPositionPost(
        assetId: string,
        requestBody: ExternalLocationCreate,
    ): CancelablePromise<ExternalLocationResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/assets/{asset_id}/external-position',
            path: {
                'asset_id': assetId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List External Positions
     * @param assetId
     * @param limit
     * @param offset
     * @returns ExternalLocationResponse Successful Response
     * @throws ApiError
     */
    public static listExternalPositionsAssetsAssetIdExternalPositionsGet(
        assetId: string,
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<Array<ExternalLocationResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/assets/{asset_id}/external-positions',
            path: {
                'asset_id': assetId,
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
    /**
     * List Floor Path
     * Return an asset's floor-frame ``(x, y)`` path (ascending time).
     * @param assetId
     * @param since
     * @param until
     * @param source
     * @param limit
     * @returns FloorPositionResponse Successful Response
     * @throws ApiError
     */
    public static listFloorPathAssetsAssetIdFloorPathGet(
        assetId: string,
        since?: (string | null),
        until?: (string | null),
        source?: (string | null),
        limit: number = 500,
    ): CancelablePromise<Array<FloorPositionResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/assets/{asset_id}/floor-path',
            path: {
                'asset_id': assetId,
            },
            query: {
                'since': since,
                'until': until,
                'source': source,
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Load Asset
     * Attach `asset_id` to `body.parent_asset_id` (carrier). Idempotent.
     * @param assetId
     * @param requestBody
     * @returns AssetResponse Successful Response
     * @throws ApiError
     */
    public static loadAssetAssetsAssetIdLoadPost(
        assetId: string,
        requestBody: AssetLoadRequest,
    ): CancelablePromise<AssetResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/assets/{asset_id}/load',
            path: {
                'asset_id': assetId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Manifest
     * Return the recursive containment tree rooted at `asset_id`.
     * @param assetId
     * @returns ManifestResponse Successful Response
     * @throws ApiError
     */
    public static getManifestAssetsAssetIdManifestGet(
        assetId: string,
    ): CancelablePromise<ManifestResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/assets/{asset_id}/manifest',
            path: {
                'asset_id': assetId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Asset Path
     * Merged RFID + external-fix timeline for the asset, ascending by time.
     * @param assetId
     * @param since
     * @param until
     * @param limit
     * @returns AssetPathPoint Successful Response
     * @throws ApiError
     */
    public static getAssetPathAssetsAssetIdPathGet(
        assetId: string,
        since: string,
        until: string,
        limit: number = 1000,
    ): CancelablePromise<Array<AssetPathPoint>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/assets/{asset_id}/path',
            path: {
                'asset_id': assetId,
            },
            query: {
                'since': since,
                'until': until,
                'limit': limit,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Record Floor Position
     * Record a precomputed floor ``(x, y)`` fix (BYO — vendor / RTLS push).
     * @param assetId
     * @param requestBody
     * @returns FloorPositionResponse Successful Response
     * @throws ApiError
     */
    public static recordFloorPositionAssetsAssetIdPositionPost(
        assetId: string,
        requestBody: FloorPositionCreate,
    ): CancelablePromise<FloorPositionResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/assets/{asset_id}/position',
            path: {
                'asset_id': assetId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Unload Asset
     * Detach `asset_id` from its current carrier. Idempotent.
     * @param assetId
     * @param requestBody
     * @returns AssetResponse Successful Response
     * @throws ApiError
     */
    public static unloadAssetAssetsAssetIdUnloadPost(
        assetId: string,
        requestBody: AssetUnloadRequest,
    ): CancelablePromise<AssetResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/assets/{asset_id}/unload',
            path: {
                'asset_id': assetId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
