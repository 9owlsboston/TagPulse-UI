/**
 * Sprint 63 — UI-config write hooks (ADR-032 v1.3).
 *
 * Covers the client-side `deepMergeUiConfig` mirror (pure) and the optimistic
 * cache behaviour of `usePatchMyUiConfig` / the invalidating `useResetMyColumns`,
 * with the generated `UiConfigService` mocked so no network is touched.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  deepMergeUiConfig,
  usePatchMyUiConfig,
  useResetMyColumns,
  UI_CONFIG_KEY,
} from '@/hooks/useUiConfig';
import type { UiConfig } from '@/api/generated/models/UiConfig';

const patchSvc = vi.fn();
const deleteSvc = vi.fn();

vi.mock('@/api/generated/services/UiConfigService', () => ({
  UiConfigService: {
    patchUiConfigMeUiConfigMePatch: (body: UiConfig) => patchSvc(body),
    deleteUiConfigMeColumnsUiConfigMeColumnsPageDelete: (page: string) => deleteSvc(page),
  },
}));

describe('deepMergeUiConfig', () => {
  it('recurses nested objects and replaces list leaves wholesale', () => {
    const base: UiConfig = {
      cards: { dashboard: { hidden: ['a'] } },
      columns: { assets: { hidden: ['metadata'] } },
    };
    const merged = deepMergeUiConfig(base, {
      columns: { assets: { hidden: ['metadata', 'tid'] } },
    });
    // columns.assets.hidden replaced wholesale; cards untouched.
    expect(merged.columns?.assets?.hidden).toEqual(['metadata', 'tid']);
    expect(merged.cards?.dashboard?.hidden).toEqual(['a']);
  });

  it('adds a new leaf without disturbing siblings', () => {
    const base: UiConfig = { cards: { dashboard: { hidden: ['a'] } } };
    const merged = deepMergeUiConfig(base, { columns: { tag_reads: { hidden: ['tid'] } } });
    expect(merged.cards?.dashboard?.hidden).toEqual(['a']);
    expect(merged.columns?.tag_reads?.hidden).toEqual(['tid']);
  });

  it('does not mutate the base object', () => {
    const base: UiConfig = { columns: { assets: { hidden: ['metadata'] } } };
    deepMergeUiConfig(base, { columns: { assets: { hidden: [] } } });
    expect(base.columns?.assets?.hidden).toEqual(['metadata']);
  });
});

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function PatchHarness() {
  const patch = usePatchMyUiConfig();
  return (
    <button onClick={() => patch.mutate({ columns: { assets: { hidden: ['metadata', 'tid'] } } })}>
      patch
    </button>
  );
}

function ResetHarness() {
  const reset = useResetMyColumns();
  return <button onClick={() => reset.mutate('assets')}>reset</button>;
}

describe('usePatchMyUiConfig', () => {
  beforeEach(() => {
    patchSvc.mockReset();
    deleteSvc.mockReset();
  });

  it('optimistically deep-merges the body into the resolved cache', async () => {
    const qc = makeClient();
    qc.setQueryData<UiConfig>(UI_CONFIG_KEY, {
      cards: { dashboard: { hidden: ['x'] } },
      columns: { assets: { hidden: ['metadata'] } },
    });
    // Never resolves → the optimistic cache state stays observable.
    patchSvc.mockReturnValue(new Promise(() => {}));

    render(
      <QueryClientProvider client={qc}>
        <PatchHarness />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByText('patch'));

    await waitFor(() => {
      const cached = qc.getQueryData<UiConfig>(UI_CONFIG_KEY);
      expect(cached?.columns?.assets?.hidden).toEqual(['metadata', 'tid']);
      // sibling leaf preserved
      expect(cached?.cards?.dashboard?.hidden).toEqual(['x']);
    });
    expect(patchSvc).toHaveBeenCalledWith({ columns: { assets: { hidden: ['metadata', 'tid'] } } });
  });

  it('rolls the cache back when the write fails', async () => {
    const qc = makeClient();
    const original: UiConfig = { columns: { assets: { hidden: ['metadata'] } } };
    qc.setQueryData<UiConfig>(UI_CONFIG_KEY, original);
    patchSvc.mockRejectedValue(new Error('boom'));

    render(
      <QueryClientProvider client={qc}>
        <PatchHarness />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByText('patch'));

    await waitFor(() => {
      const cached = qc.getQueryData<UiConfig>(UI_CONFIG_KEY);
      expect(cached?.columns?.assets?.hidden).toEqual(['metadata']);
    });
  });
});

describe('useResetMyColumns', () => {
  beforeEach(() => {
    patchSvc.mockReset();
    deleteSvc.mockReset();
  });

  it('DELETEs the page leaf and invalidates the resolved config', async () => {
    const qc = makeClient();
    deleteSvc.mockResolvedValue({});
    const invalidate = vi.spyOn(qc, 'invalidateQueries');

    render(
      <QueryClientProvider client={qc}>
        <ResetHarness />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByText('reset'));

    await waitFor(() => expect(deleteSvc).toHaveBeenCalledWith('assets'));
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: UI_CONFIG_KEY }));
  });
});
