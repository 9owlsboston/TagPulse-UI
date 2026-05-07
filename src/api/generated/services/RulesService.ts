/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AlertResponse } from '../models/AlertResponse';
import type { RuleCreate } from '../models/RuleCreate';
import type { RuleResponse } from '../models/RuleResponse';
import type { RuleUpdate } from '../models/RuleUpdate';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class RulesService {
    /**
     * List Rule Templates
     * List built-in rule templates the UI can offer as starting points.
     *
     * The ``requires_subject_kind`` field is a discoverability hint — the
     * backend does not gate access. The UI is expected to filter the list
     * against the tenant's configured ``telemetry_subject_kinds`` and
     * available ``telemetry_models`` rows.
     * @returns any Successful Response
     * @throws ApiError
     */
    public static listRuleTemplatesRuleTemplatesGet(): CancelablePromise<Array<Record<string, any>>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/rule-templates',
        });
    }
    /**
     * Get Rule Template
     * @param templateKey
     * @returns any Successful Response
     * @throws ApiError
     */
    public static getRuleTemplateRuleTemplatesTemplateKeyGet(
        templateKey: string,
    ): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/rule-templates/{template_key}',
            path: {
                'template_key': templateKey,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Rule
     * Create a new rule.
     * @param requestBody
     * @returns RuleResponse Successful Response
     * @throws ApiError
     */
    public static createRuleRulesPost(
        requestBody: RuleCreate,
    ): CancelablePromise<RuleResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/rules',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Rules
     * List all rules for the tenant.
     * @param enabledOnly
     * @returns RuleResponse Successful Response
     * @throws ApiError
     */
    public static listRulesRulesGet(
        enabledOnly: boolean = false,
    ): CancelablePromise<Array<RuleResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/rules',
            query: {
                'enabled_only': enabledOnly,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Rule
     * Get a single rule by ID.
     * @param ruleId
     * @returns RuleResponse Successful Response
     * @throws ApiError
     */
    public static getRuleRulesRuleIdGet(
        ruleId: string,
    ): CancelablePromise<RuleResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/rules/{rule_id}',
            path: {
                'rule_id': ruleId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Rule
     * Update a rule (partial update).
     * @param ruleId
     * @param requestBody
     * @returns RuleResponse Successful Response
     * @throws ApiError
     */
    public static updateRuleRulesRuleIdPatch(
        ruleId: string,
        requestBody: RuleUpdate,
    ): CancelablePromise<RuleResponse> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/rules/{rule_id}',
            path: {
                'rule_id': ruleId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Rule
     * Delete a rule.
     * @param ruleId
     * @returns void
     * @throws ApiError
     */
    public static deleteRuleRulesRuleIdDelete(
        ruleId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/rules/{rule_id}',
            path: {
                'rule_id': ruleId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Alerts
     * List alert history with filters.
     * @param ruleId
     * @param deviceId
     * @param status
     * @param limit
     * @param offset
     * @returns AlertResponse Successful Response
     * @throws ApiError
     */
    public static listAlertsAlertsGet(
        ruleId?: (string | null),
        deviceId?: (string | null),
        status?: (string | null),
        limit: number = 100,
        offset?: number,
    ): CancelablePromise<Array<AlertResponse>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/alerts',
            query: {
                'rule_id': ruleId,
                'device_id': deviceId,
                'status': status,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Acknowledge Alert
     * Acknowledge an alert.
     * @param alertId
     * @returns void
     * @throws ApiError
     */
    public static acknowledgeAlertAlertsAlertIdAcknowledgePost(
        alertId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/alerts/{alert_id}/acknowledge',
            path: {
                'alert_id': alertId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
