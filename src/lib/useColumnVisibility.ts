/**
 * Cross-device column visibility (Sprint 63, configurable-column-visibility
 * Tier 2; ADR-032 v1.3).
 *
 * Replaces the Sprint 62 device-local `useLocalColumnVisibility` (localStorage):
 * a user's per-table column choices now persist in their **user layer** on the
 * server, so they follow the user across devices and sessions. The hidden set
 * is read straight from the server-resolved `columns.<page>` leaf
 * (`useColumnGroup`, fed by `GET /ui-config`'s System -> Tenant -> Role -> User
 * merge); writes go through the merge-style `PATCH /ui-config/me` (so they
 * compose with the user's `cards`/`nav` prefs instead of clobbering them) and
 * the granular `DELETE /ui-config/me/columns/{page}` reset.
 *
 * Two distinct resets (ADR-032 §2, both Office-grade):
 *   - **showAll** — user override `columns.<page>.hidden = []`, which *overrides*
 *     the tenant/role floor (list-replace merge): the user sees every column.
 *   - **resetToTeamDefault** — *remove* the user's `columns.<page>` leaf so the
 *     page re-inherits the tenant/role/system floor.
 *
 * Because `GET /ui-config` only returns the *resolved* doc (no read-own-layer
 * endpoint), a write sends the full intended hidden list (current resolved set
 * ± the toggled key); this freezes the current floor hides into the user layer
 * for that leaf — the documented list-replace trade-off that `resetToTeamDefault`
 * undoes.
 */
import { useCallback, useMemo } from 'react';
import { useColumnGroup } from '@/lib/uiConfig';
import { usePatchMyUiConfig, useResetMyColumns } from '@/hooks/useUiConfig';

export interface ColumnVisibility {
  /** Column keys currently hidden for the page (the resolved user/role/tenant set). */
  hidden: Set<string>;
  /** Show (`visible=true`) or hide (`visible=false`) a single column key. */
  setColumnVisible: (key: string, visible: boolean) => void;
  /** Reveal every column — user override `hidden = []`, overriding the floor (reset A). */
  showAll: () => void;
  /** Drop the user's column override so the page re-inherits the team default (reset B). */
  resetToTeamDefault: () => void;
  /** True when at least one column is hidden. */
  hasHidden: boolean;
  /** True while a visibility write is in flight (for disabling controls). */
  isSaving: boolean;
}

/**
 * Server-backed hidden-column state for a list page.
 *
 * `page` is the same page key the server `columns.<page>` leaf uses (e.g.
 * `"tag_reads"`). Returns the resolved hidden set plus the toggle / show-all /
 * reset-to-team-default actions; callers feed `hidden` to a `ColumnChooser` and
 * let the resolved `columns.<page>` config (via `applyColumnConfig`) drive the
 * rendered table — a write invalidates `GET /ui-config`, so both update.
 */
export function useColumnVisibility(page: string): ColumnVisibility {
  const group = useColumnGroup(page);
  const patch = usePatchMyUiConfig();
  const reset = useResetMyColumns();

  const hidden = useMemo(() => new Set(group.hidden), [group.hidden]);

  const setColumnVisible = useCallback(
    (key: string, visible: boolean) => {
      const next = new Set(hidden);
      if (visible) next.delete(key);
      else next.add(key);
      patch.mutate({ columns: { [page]: { hidden: [...next] } } });
    },
    [hidden, page, patch],
  );

  const showAll = useCallback(() => {
    if (hidden.size === 0) return; // already showing everything — no-op
    patch.mutate({ columns: { [page]: { hidden: [] } } });
  }, [hidden.size, page, patch]);

  const resetToTeamDefault = useCallback(() => {
    reset.mutate(page);
  }, [page, reset]);

  return {
    hidden,
    setColumnVisible,
    showAll,
    resetToTeamDefault,
    hasHidden: hidden.size > 0,
    isSaving: patch.isPending || reset.isPending,
  };
}
