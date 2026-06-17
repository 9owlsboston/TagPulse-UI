/**
 * Per-device column visibility (Sprint 62, configurable-column-visibility Tier 1).
 *
 * The device-local layer of the column-visibility feature: a user hides columns
 * on a list page and the choice persists in `localStorage` for this browser
 * only (mirrors the Dashboard "Customize" precedent). It sits *on top of* the
 * server-resolved `columns.<page>` config (ADR-032) — the server floor still
 * applies; this layer can only hide *more* columns, and "Show all" clears the
 * local hides (revealing everything the server config still permits). The
 * cross-device version is Tier 2 (`PUT /ui-config/me`), a later sprint.
 *
 * Storage is best-effort: a disabled/full `localStorage` degrades to in-memory
 * state for the session rather than throwing.
 */
import { useCallback, useMemo, useState } from 'react';

const STORAGE_PREFIX = 'tagpulse.columns.';

/** localStorage key for a page's device-local hidden-column set. */
function hiddenKey(page: string): string {
  return `${STORAGE_PREFIX}${page}.hidden`;
}

function loadHidden(page: string): string[] {
  try {
    const raw = localStorage.getItem(hiddenKey(page));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveHidden(page: string, value: string[]): void {
  try {
    // An empty set is the default — remove the key rather than store `[]` so a
    // "Show all" leaves no trace (and `hasStored`-style probes stay honest).
    if (value.length === 0) localStorage.removeItem(hiddenKey(page));
    else localStorage.setItem(hiddenKey(page), JSON.stringify(value));
  } catch {
    /* localStorage may be disabled / full — personalisation is best-effort. */
  }
}

export interface LocalColumnVisibility {
  /** Column keys the user has hidden on this device for the page. */
  hidden: Set<string>;
  /** Show (`visible=true`) or hide (`visible=false`) a single column key. */
  setColumnVisible: (key: string, visible: boolean) => void;
  /** Clear every local hide for the page (the "Show all" action). */
  showAll: () => void;
  /** True when at least one column is locally hidden. */
  hasHidden: boolean;
}

/**
 * Device-local hidden-column state for a list page, persisted to localStorage.
 *
 * `page` is the same page key the server `columns.<page>` leaf uses (e.g.
 * `"tag_reads"`), so the two layers line up. Returns the hidden set plus
 * toggling + "Show all" actions; callers filter their server-visible columns by
 * `hidden` and feed the addressable column list to a `ColumnChooser`.
 */
export function useLocalColumnVisibility(page: string): LocalColumnVisibility {
  const [hiddenList, setHiddenList] = useState<string[]>(() => loadHidden(page));

  const setColumnVisible = useCallback(
    (key: string, visible: boolean) => {
      setHiddenList((prev) => {
        const has = prev.includes(key);
        if (visible === !has) return prev; // already in the desired state
        const next = visible ? prev.filter((k) => k !== key) : [...prev, key];
        saveHidden(page, next);
        return next;
      });
    },
    [page],
  );

  const showAll = useCallback(() => {
    setHiddenList((prev) => {
      if (prev.length === 0) return prev;
      saveHidden(page, []);
      return [];
    });
  }, [page]);

  const hidden = useMemo(() => new Set(hiddenList), [hiddenList]);

  return { hidden, setColumnVisible, showAll, hasHidden: hiddenList.length > 0 };
}
