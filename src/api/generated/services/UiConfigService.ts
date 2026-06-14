/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { UiConfig } from '../models/UiConfig';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class UiConfigService {
    /**
     * Get Ui Config
     * Return the presentation config resolved for the calling viewer.
     *
     * Folds System → Tenant → Role → User server-side so the UI never
     * reconstructs the merge.
     * @returns UiConfig Successful Response
     * @throws ApiError
     */
    public static getUiConfigUiConfigGet(): CancelablePromise<UiConfig> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/ui-config',
        });
    }
    /**
     * Put Ui Config Me
     * Upsert the caller's UI override and return the freshly resolved config.
     *
     * The body is a **sparse** subset of the ADR-032 §4 document; unknown or
     * ill-typed keys are rejected (422). An empty body ``{}`` clears the
     * override ("reset to team default"). Requires a real user identity — the
     * X-Tenant-ID backward-compat path has no user to attach prefs to.
     * @param requestBody
     * @returns UiConfig Successful Response
     * @throws ApiError
     */
    public static putUiConfigMeUiConfigMePut(
        requestBody: Record<string, any>,
    ): CancelablePromise<UiConfig> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/ui-config/me',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Put Ui Config Role
     * Set a per-role default presentation layer (admin only).
     *
     * ``role`` must be one of the known roles (``admin`` / ``editor`` /
     * ``viewer``); an unknown role is rejected (422). The body is a **sparse**
     * subset of the ADR-032 §4 document, rejecting unknown/ill-typed keys (422).
     * It replaces that role's layer wholesale; an empty body ``{}`` removes the
     * role layer (reset). The tenant-default leaves and other roles are
     * untouched. Audited. Returns the caller's freshly resolved config.
     * @param role
     * @param requestBody
     * @returns UiConfig Successful Response
     * @throws ApiError
     */
    public static putUiConfigRoleUiConfigRoleRolePut(
        role: string,
        requestBody: Record<string, any>,
    ): CancelablePromise<UiConfig> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/ui-config/role/{role}',
            path: {
                'role': role,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Put Ui Config Tenant
     * Set the tenant-default presentation layer (admin only).
     *
     * The body is a **sparse** subset of the ADR-032 §4 document; unknown or
     * ill-typed keys are rejected (422). It replaces the tenant-default leaves
     * wholesale while preserving the per-role layer (managed via
     * ``PUT /ui-config/role/{role}``). An empty body ``{}`` clears the
     * tenant-default leaves. Audited. Returns the caller's freshly resolved
     * config.
     * @param requestBody
     * @returns UiConfig Successful Response
     * @throws ApiError
     */
    public static putUiConfigTenantUiConfigTenantPut(
        requestBody: Record<string, any>,
    ): CancelablePromise<UiConfig> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/ui-config/tenant',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
