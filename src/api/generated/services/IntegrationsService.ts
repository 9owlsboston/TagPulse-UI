/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DeliveryResponse } from '../models/DeliveryResponse';
import type { IntegrationCreate } from '../models/IntegrationCreate';
import type { IntegrationResponse } from '../models/IntegrationResponse';
import type { IntegrationUpdate } from '../models/IntegrationUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class IntegrationsService {
    /**
     * List Integrations
     * List all integration targets.
     * @returns IntegrationResponse Successful Response
     * @throws ApiError
     */
    public static listIntegrationsIntegrationsGet(): CancelablePromise<Array<IntegrationResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/integrations',
        });
    }
    /**
     * Create Integration
     * Create an integration target (webhook, SSE, export).
     * @param requestBody
     * @returns IntegrationResponse Successful Response
     * @throws ApiError
     */
    public static createIntegrationIntegrationsPost(
        requestBody: IntegrationCreate,
    ): CancelablePromise<IntegrationResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/integrations',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Integration
     * Get an integration target by ID.
     * @param integrationId
     * @returns IntegrationResponse Successful Response
     * @throws ApiError
     */
    public static getIntegrationIntegrationsIntegrationIdGet(
        integrationId: string,
    ): CancelablePromise<IntegrationResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/integrations/{integration_id}',
            path: {
                'integration_id': integrationId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Integration
     * Update an integration target.
     * @param integrationId
     * @param requestBody
     * @returns IntegrationResponse Successful Response
     * @throws ApiError
     */
    public static updateIntegrationIntegrationsIntegrationIdPatch(
        integrationId: string,
        requestBody: IntegrationUpdate,
    ): CancelablePromise<IntegrationResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/integrations/{integration_id}',
            path: {
                'integration_id': integrationId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Integration
     * Delete an integration target.
     * @param integrationId
     * @returns void
     * @throws ApiError
     */
    public static deleteIntegrationIntegrationsIntegrationIdDelete(
        integrationId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/integrations/{integration_id}',
            path: {
                'integration_id': integrationId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Deliveries
     * List delivery history for an integration target.
     * @param integrationId
     * @param limit
     * @param offset
     * @returns DeliveryResponse Successful Response
     * @throws ApiError
     */
    public static listDeliveriesIntegrationsIntegrationIdDeliveriesGet(
        integrationId: string,
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<Array<DeliveryResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/integrations/{integration_id}/deliveries',
            path: {
                'integration_id': integrationId,
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
     * Stream Events
     * SSE endpoint — streams real-time events filtered by tenant and event type.
     * @param events
     * @returns any Successful Response
     * @throws ApiError
     */
    public static streamEventsIntegrationsStreamGet(
        events: string = 'tag_read.created,alert.triggered',
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/integrations/stream',
            query: {
                'events': events,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
