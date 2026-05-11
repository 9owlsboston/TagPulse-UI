/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * A quarantined telemetry reading awaiting model fix-up or review.
 *
 * Sprint 18 added optional ``subject_kind`` / ``subject_id`` fields:
 * legacy back-filled rows leave them ``None``; multi-subject ingest
 * (Sprint 19) populates them so reviewers can see *what* the failed
 * reading was meant to describe.
 */
export type TelemetryQuarantineResponse = {
    device_id: string;
    id: string;
    metric_name: string;
    metric_value: (number | null);
    raw_payload: Record<string, any>;
    reason: string;
    received_at: string;
    subject_id?: (string | null);
    subject_kind?: ('device' | 'asset' | 'lot' | 'stock_item' | 'zone' | null);
};

