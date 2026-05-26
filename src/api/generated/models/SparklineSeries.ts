/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SparklinePoint } from './SparklinePoint';
/**
 * Downsampled 7-day trend backing one Dashboard KPI tile.
 *
 * Sprint 57 Phase 57.6. Tiles whose underlying schema has no
 * point-in-time history (e.g. devices total, tag count, location
 * count) return a flat series — every bucket repeats the current
 * value and ``trend`` is ``"flat"``. Tiles backed by true
 * time-series tables (``tag_reads``, ``alerts``) return real
 * bucketed counts and a comparison-derived ``trend``.
 */
export type SparklineSeries = {
    series: Array<SparklinePoint>;
    trend: SparklineSeries.trend;
};
export namespace SparklineSeries {
    export enum trend {
        UP = 'up',
        DOWN = 'down',
        FLAT = 'flat',
    }
}

