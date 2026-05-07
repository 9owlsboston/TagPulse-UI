/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Most-recent reading for a single metric on a subject.
 *
 * Embedded on ``GET /assets/{id}`` and ``GET /lots/{id}`` (capped at
 * the 5 most-recently-written metrics per subject) so callers do not
 * have to issue a follow-up ``/telemetry/readings?...&limit=1`` for
 * each metric they want to display.
 */
export type LatestTelemetryEntry = {
    metric_name: string;
    metric_value: number;
    unit?: (string | null);
    timestamp: string;
    source: LatestTelemetryEntry.source;
};
export namespace LatestTelemetryEntry {
    export enum source {
        DEVICE = 'device',
        TAG = 'tag',
        EXTERNAL = 'external',
        DERIVED = 'derived',
    }
}

