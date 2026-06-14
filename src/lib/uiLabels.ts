/**
 * Configurable-UI label registry (Sprint 60, ADR-032 §4 `labels`).
 *
 * Mirrors the backend `LABEL_KEYS` registry in
 * `TagPulse/src/tagpulse/services/ui_config.py` — the curated set of skinnable
 * entity/nav terms and their canonical default display labels. This is the
 * UI-side fallback: when `GET /ui-config` hasn't resolved yet (or the backend
 * predates the endpoint), components still render today's terms. The resolved
 * document the backend returns already carries the full map (defaults overlaid
 * with any tenant/role/user skin), so at runtime we merge the server map over
 * these defaults — never re-derive a default the backend didn't send.
 *
 * Keep this in lockstep with the backend registry; a key here that the backend
 * doesn't know would be rejected (422) on write, and a backend key missing here
 * just falls through to the server value (the merge tolerates extras).
 */

export const DEFAULT_LABELS = {
  device: 'Device',
  telemetry: 'Telemetry',
  asset: 'Asset',
  tag: 'Tag',
  tagRead: 'Tag Read',
  zone: 'Zone',
  site: 'Site',
  lot: 'Lot',
  stockItem: 'Stock Item',
  alert: 'Alert',
  rule: 'Rule',
} as const;

/** A registered, skinnable label key (the keys of {@link DEFAULT_LABELS}). */
export type LabelKey = keyof typeof DEFAULT_LABELS;

/** The resolved label map served to the UI — every registered term to its
 * effective display string (canonical default overlaid with any skin). */
export type LabelMap = Record<string, string>;

/**
 * Pluralize a (possibly skinned) singular display label for plural surfaces
 * like the nav sidebar ("Reader" → "Readers", "Tag Read" → "Tag Reads").
 *
 * The label skin curates *singular* nouns (matching the backend registry); the
 * nav renders plurals, so the count-noun pluralization is a UI concern. Regular
 * English rules cover every term in the registry: sibilant endings take `-es`,
 * a consonant+`y` ending takes `-ies`, everything else takes `-s`.
 */
export function pluralizeLabel(label: string): string {
  if (/(s|x|z|ch|sh)$/i.test(label)) return `${label}es`;
  if (/[^aeiou]y$/i.test(label)) return `${label.slice(0, -1)}ies`;
  return `${label}s`;
}

/**
 * Resolve a registered term to its effective singular display label, folding
 * the server-resolved map over the canonical defaults. Falls back to the
 * canonical default for a key the server map doesn't carry.
 */
export function resolveLabel(labels: LabelMap | undefined, key: LabelKey): string {
  return labels?.[key] ?? DEFAULT_LABELS[key];
}
