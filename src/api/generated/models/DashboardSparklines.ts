/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SparklineSeries } from './SparklineSeries';
/**
 * Bundle of sparkline series for the Dashboard's 9 KPI tiles.
 *
 * Returned by ``GET /dashboard/sparklines``. One round-trip per
 * Dashboard load. ``tiles`` is keyed by the tile ``id`` field
 * used in ``src/pages/Dashboard.tsx`` so client wire-up is a
 * direct lookup. New tiles in the UI without a corresponding
 * series here render the tile without a sparkline (graceful
 * degradation).
 */
export type DashboardSparklines = {
    bucket_hours: number;
    days: number;
    generated_at: string;
    tiles: Record<string, SparklineSeries>;
};

