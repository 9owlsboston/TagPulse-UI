/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CardGroup } from './CardGroup';
import type { ColumnGroup } from './ColumnGroup';
import type { NavConfig } from './NavConfig';
import type { TableConfig } from './TableConfig';
import type { ThemeConfig } from './ThemeConfig';
/**
 * The resolved presentation-config document served by ``GET /ui-config``.
 *
 * ``cards`` / ``columns`` / ``tables`` are keyed by page name (e.g.
 * ``"assets"``, ``"tag_reads"``); ``labels`` is the display-label skin — a
 * map of curated term keys (``LABEL_KEYS``) to display strings. ``labels``
 * defaults to the full canonical registry so the resolved document always
 * carries every term (the UI reads one authoritative ``labels[key]``).
 */
export type UiConfig = {
    cards?: Record<string, CardGroup>;
    columns?: Record<string, ColumnGroup>;
    labels?: Record<string, string>;
    nav?: NavConfig;
    tables?: Record<string, TableConfig>;
    theme?: ThemeConfig;
};

