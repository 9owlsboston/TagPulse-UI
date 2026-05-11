/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_import_lots_lots_import_post } from '../models/Body_import_lots_lots_import_post';
import type { Body_import_products_products_import_post } from '../models/Body_import_products_products_import_post';
import type { Body_import_stock_items_stock_items_import_post } from '../models/Body_import_stock_items_stock_items_import_post';
import type { CollisionPreflight } from '../models/CollisionPreflight';
import type { ImportSummary } from '../models/ImportSummary';
import type { LotCreate } from '../models/LotCreate';
import type { LotResponse } from '../models/LotResponse';
import type { LotUpdate } from '../models/LotUpdate';
import type { ProductCreate } from '../models/ProductCreate';
import type { ProductResponse } from '../models/ProductResponse';
import type { ProductUpdate } from '../models/ProductUpdate';
import type { StockItemCreate } from '../models/StockItemCreate';
import type { StockItemResponse } from '../models/StockItemResponse';
import type { StockItemUpdate } from '../models/StockItemUpdate';
import type { StockLevelRow } from '../models/StockLevelRow';
import type { StockMovementCreate } from '../models/StockMovementCreate';
import type { StockMovementResponse } from '../models/StockMovementResponse';
import type { TagDataMappingCreate } from '../models/TagDataMappingCreate';
import type { TagDataMappingResponse } from '../models/TagDataMappingResponse';
import type { TagDataMappingUpdate } from '../models/TagDataMappingUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class InventoryService {
    /**
     * List All Lots
     * Cross-product lot list. Used by the UI Lot Expiry Queue page.
     * @param expiringWithinDays
     * @param limit
     * @param offset
     * @returns LotResponse Successful Response
     * @throws ApiError
     */
    public static listAllLotsLotsGet(
        expiringWithinDays?: (number | null),
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<Array<LotResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/lots',
            query: {
                'expiring_within_days': expiringWithinDays,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Import Lots
     * @param formData
     * @returns ImportSummary Successful Response
     * @throws ApiError
     */
    public static importLotsLotsImportPost(
        formData: Body_import_lots_lots_import_post,
    ): CancelablePromise<ImportSummary> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/lots/import',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Lot
     * @param lotId
     * @returns void
     * @throws ApiError
     */
    public static deleteLotLotsLotIdDelete(
        lotId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/lots/{lot_id}',
            path: {
                'lot_id': lotId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Lot
     * Fetch a single lot. Sprint 19: embeds ``latest_telemetry`` when
     * the tenant has opted into ``subject_kind='lot'``.
     * @param lotId
     * @returns LotResponse Successful Response
     * @throws ApiError
     */
    public static getLotLotsLotIdGet(
        lotId: string,
    ): CancelablePromise<LotResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/lots/{lot_id}',
            path: {
                'lot_id': lotId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Lot
     * @param lotId
     * @param requestBody
     * @returns LotResponse Successful Response
     * @throws ApiError
     */
    public static updateLotLotsLotIdPatch(
        lotId: string,
        requestBody: LotUpdate,
    ): CancelablePromise<LotResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/lots/{lot_id}',
            path: {
                'lot_id': lotId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Products
     * @param category
     * @param q
     * @param limit
     * @param offset
     * @returns ProductResponse Successful Response
     * @throws ApiError
     */
    public static listProductsProductsGet(
        category?: (string | null),
        q?: (string | null),
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<Array<ProductResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/products',
            query: {
                'category': category,
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
     * Create Product
     * @param requestBody
     * @returns ProductResponse Successful Response
     * @throws ApiError
     */
    public static createProductProductsPost(
        requestBody: ProductCreate,
    ): CancelablePromise<ProductResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/products',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Import Products
     * @param formData
     * @returns ImportSummary Successful Response
     * @throws ApiError
     */
    public static importProductsProductsImportPost(
        formData: Body_import_products_products_import_post,
    ): CancelablePromise<ImportSummary> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/products/import',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Product
     * @param productId
     * @returns void
     * @throws ApiError
     */
    public static deleteProductProductsProductIdDelete(
        productId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/products/{product_id}',
            path: {
                'product_id': productId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Product
     * @param productId
     * @returns ProductResponse Successful Response
     * @throws ApiError
     */
    public static getProductProductsProductIdGet(
        productId: string,
    ): CancelablePromise<ProductResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/products/{product_id}',
            path: {
                'product_id': productId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Product
     * @param productId
     * @param requestBody
     * @returns ProductResponse Successful Response
     * @throws ApiError
     */
    public static updateProductProductsProductIdPatch(
        productId: string,
        requestBody: ProductUpdate,
    ): CancelablePromise<ProductResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/products/{product_id}',
            path: {
                'product_id': productId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Lots
     * @param productId
     * @param expiringWithinDays
     * @param limit
     * @param offset
     * @returns LotResponse Successful Response
     * @throws ApiError
     */
    public static listLotsProductsProductIdLotsGet(
        productId: string,
        expiringWithinDays?: (number | null),
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<Array<LotResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/products/{product_id}/lots',
            path: {
                'product_id': productId,
            },
            query: {
                'expiring_within_days': expiringWithinDays,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Lot
     * @param productId
     * @param requestBody
     * @returns LotResponse Successful Response
     * @throws ApiError
     */
    public static createLotProductsProductIdLotsPost(
        productId: string,
        requestBody: LotCreate,
    ): CancelablePromise<LotResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/products/{product_id}/lots',
            path: {
                'product_id': productId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Stock Items
     * @param productId
     * @param lotId
     * @param zoneId
     * @param state
     * @param limit
     * @param offset
     * @returns StockItemResponse Successful Response
     * @throws ApiError
     */
    public static listStockItemsStockItemsGet(
        productId?: (string | null),
        lotId?: (string | null),
        zoneId?: (string | null),
        state?: (string | null),
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<Array<StockItemResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/stock-items',
            query: {
                'product_id': productId,
                'lot_id': lotId,
                'zone_id': zoneId,
                'state': state,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Stock Item
     * @param requestBody
     * @returns StockItemResponse Successful Response
     * @throws ApiError
     */
    public static createStockItemStockItemsPost(
        requestBody: StockItemCreate,
    ): CancelablePromise<StockItemResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/stock-items',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Import Stock Items
     * @param formData
     * @param preflight If true, return cross-tenant collision report and create nothing.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static importStockItemsStockItemsImportPost(
        formData: Body_import_stock_items_stock_items_import_post,
        preflight: boolean = false,
    ): CancelablePromise<(ImportSummary | CollisionPreflight)> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/stock-items/import',
            query: {
                'preflight': preflight,
            },
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Stock Item
     * @param stockItemId
     * @param force
     * @returns void
     * @throws ApiError
     */
    public static deleteStockItemStockItemsStockItemIdDelete(
        stockItemId: string,
        force: boolean = false,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/stock-items/{stock_item_id}',
            path: {
                'stock_item_id': stockItemId,
            },
            query: {
                'force': force,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Stock Item
     * @param stockItemId
     * @returns StockItemResponse Successful Response
     * @throws ApiError
     */
    public static getStockItemStockItemsStockItemIdGet(
        stockItemId: string,
    ): CancelablePromise<StockItemResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/stock-items/{stock_item_id}',
            path: {
                'stock_item_id': stockItemId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Stock Item
     * @param stockItemId
     * @param requestBody
     * @returns StockItemResponse Successful Response
     * @throws ApiError
     */
    public static updateStockItemStockItemsStockItemIdPatch(
        stockItemId: string,
        requestBody: StockItemUpdate,
    ): CancelablePromise<StockItemResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/stock-items/{stock_item_id}',
            path: {
                'stock_item_id': stockItemId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Stock Levels
     * @param productId
     * @param zoneId
     * @returns StockLevelRow Successful Response
     * @throws ApiError
     */
    public static stockLevelsStockLevelsGet(
        productId?: (string | null),
        zoneId?: (string | null),
    ): CancelablePromise<Array<StockLevelRow>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/stock-levels',
            query: {
                'product_id': productId,
                'zone_id': zoneId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Stock Movements
     * @param stockItemId
     * @param productId
     * @param zoneId
     * @param since
     * @param until
     * @param limit
     * @param offset
     * @returns StockMovementResponse Successful Response
     * @throws ApiError
     */
    public static stockMovementsStockMovementsGet(
        stockItemId?: (string | null),
        productId?: (string | null),
        zoneId?: (string | null),
        since?: (string | null),
        until?: (string | null),
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<Array<StockMovementResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/stock-movements',
            query: {
                'stock_item_id': stockItemId,
                'product_id': productId,
                'zone_id': zoneId,
                'since': since,
                'until': until,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Stock Movement
     * Create a manual stock adjustment (enter/exit/adjustment).
     * @param requestBody
     * @returns StockMovementResponse Successful Response
     * @throws ApiError
     */
    public static createStockMovementStockMovementsPost(
        requestBody: StockMovementCreate,
    ): CancelablePromise<StockMovementResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/stock-movements',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Tag Data Mappings
     * @param scopeKind
     * @param scopeId
     * @returns TagDataMappingResponse Successful Response
     * @throws ApiError
     */
    public static listTagDataMappingsTagDataMappingsGet(
        scopeKind?: (string | null),
        scopeId?: (string | null),
    ): CancelablePromise<Array<TagDataMappingResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/tag-data-mappings',
            query: {
                'scope_kind': scopeKind,
                'scope_id': scopeId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Tag Data Mapping
     * @param requestBody
     * @returns TagDataMappingResponse Successful Response
     * @throws ApiError
     */
    public static createTagDataMappingTagDataMappingsPost(
        requestBody: TagDataMappingCreate,
    ): CancelablePromise<TagDataMappingResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/tag-data-mappings',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Tag Data Mapping
     * @param mappingId
     * @returns void
     * @throws ApiError
     */
    public static deleteTagDataMappingTagDataMappingsMappingIdDelete(
        mappingId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/tag-data-mappings/{mapping_id}',
            path: {
                'mapping_id': mappingId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Tag Data Mapping
     * @param mappingId
     * @param requestBody
     * @returns TagDataMappingResponse Successful Response
     * @throws ApiError
     */
    public static updateTagDataMappingTagDataMappingsMappingIdPatch(
        mappingId: string,
        requestBody: TagDataMappingUpdate,
    ): CancelablePromise<TagDataMappingResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/tag-data-mappings/{mapping_id}',
            path: {
                'mapping_id': mappingId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
