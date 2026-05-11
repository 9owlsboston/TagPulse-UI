/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MetricDefinition } from './MetricDefinition';
/**
 * Sprint 28 G1: PATCH-style update for a telemetry model.
 *
 * Only ``metrics`` is mutable. ``subject_kind`` and ``device_type`` define
 * the model's identity (the Sprint 18 unique constraint
 * ``ix_telemetry_models_tenant_subject`` keys on these), so changing them
 * via PATCH would amount to creating a different row — callers should
 * DELETE + POST instead.
 */
export type TelemetryModelUpdate = {
    metrics: Array<MetricDefinition>;
};

