/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Theme variant + card style, riding the ADR-029 design tokens.
 *
 * Both fields are curated surfaces (ADR-032 §4): ``variant`` must name a
 * registered persona theme (``THEME_VARIANTS``) and ``card_style`` a
 * registered card visual (``CARD_STYLES``). The default is today's UI
 * (``default`` / ``default``).
 */
export type ThemeConfig = {
    cardStyle?: string;
    variant?: string;
};

