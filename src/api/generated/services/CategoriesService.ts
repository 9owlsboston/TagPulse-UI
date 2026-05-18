/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CategoryCreate } from '../models/CategoryCreate';
import type { CategoryResponse } from '../models/CategoryResponse';
import type { CategoryUpdate } from '../models/CategoryUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CategoriesService {
    /**
     * List Categories
     * List the calling tenant's categories.
     * @param categoryType
     * @param limit
     * @param offset
     * @returns CategoryResponse Successful Response
     * @throws ApiError
     */
    public static listCategoriesCategoriesGet(
        categoryType?: (string | null),
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<Array<CategoryResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/categories',
            query: {
                'category_type': categoryType,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Category
     * Create a new category (editor / admin). ``category_type`` is set here and
     * cannot be changed later.
     * @param requestBody
     * @returns CategoryResponse Successful Response
     * @throws ApiError
     */
    public static createCategoryCategoriesPost(
        requestBody: CategoryCreate,
    ): CancelablePromise<CategoryResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/categories',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Category
     * Delete a category. Admin only. 409 if any asset still
     * references it; the payload includes the count so the UI can show
     * a guarded confirmation flow.
     * @param categoryId
     * @returns void
     * @throws ApiError
     */
    public static deleteCategoryCategoriesCategoryIdDelete(
        categoryId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/categories/{category_id}',
            path: {
                'category_id': categoryId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Category
     * Get one category by id.
     * @param categoryId
     * @returns CategoryResponse Successful Response
     * @throws ApiError
     */
    public static getCategoryCategoriesCategoryIdGet(
        categoryId: string,
    ): CancelablePromise<CategoryResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/categories/{category_id}',
            path: {
                'category_id': categoryId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Category
     * Partial update. ``category_type`` is immutable — any attempt to
     * change it is rejected with 400.
     * @param categoryId
     * @param requestBody
     * @returns CategoryResponse Successful Response
     * @throws ApiError
     */
    public static updateCategoryCategoriesCategoryIdPatch(
        categoryId: string,
        requestBody: CategoryUpdate,
    ): CancelablePromise<CategoryResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/categories/{category_id}',
            path: {
                'category_id': categoryId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
