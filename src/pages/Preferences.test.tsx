import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Preferences } from '@/pages/Preferences';

// Lightweight card catalog so we don't pull Dashboard's heavy deps.
vi.mock('@/pages/Dashboard', () => ({
  DASHBOARD_CARDS: [
    { id: 'devices', title: 'Devices' },
    { id: 'low-stock', title: 'Low-stock products' },
  ],
}));

// Control the resolved cards.dashboard + nav leaves the page seeds from.
let resolvedHidden: string[] = [];
let resolvedNavHidden: string[] = [];
let resolvedPlacement: Record<string, string> = {};
vi.mock('@/lib/uiConfig', () => ({
  useCardGroup: () => ({ hidden: resolvedHidden, order: [] }),
  useNavConfig: () => ({ hidden: resolvedNavHidden, order: [], placement: resolvedPlacement }),
}));

const putMock = vi.fn().mockResolvedValue({});
vi.mock('@/api/generated/services/UiConfigService', () => ({
  UiConfigService: {
    putUiConfigMeUiConfigMePut: (body: unknown) => putMock(body),
  },
}));

function wrap(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{node}</QueryClientProvider>;
}

describe('Preferences — PUT /ui-config/me', () => {
  beforeEach(() => {
    putMock.mockClear();
    resolvedHidden = [];
    resolvedNavHidden = [];
    resolvedPlacement = {};
  });

  it('renders a checkbox per dashboard card, seeded from the resolved hidden set', () => {
    resolvedHidden = ['low-stock'];
    render(wrap(<Preferences />));
    // devices visible (checked), low-stock hidden (unchecked).
    expect(screen.getByTestId('prefs-card-devices')).toBeChecked();
    expect(screen.getByTestId('prefs-card-low-stock')).not.toBeChecked();
    expect(screen.getByTestId('prefs-visible-count')).toHaveTextContent('1 of 2 shown');
  });

  it('persists cards + nav via PUT /ui-config/me on Save', async () => {
    render(wrap(<Preferences />));
    // Hide "devices".
    fireEvent.click(screen.getByTestId('prefs-card-devices'));
    fireEvent.click(screen.getByTestId('prefs-save'));
    await waitFor(() => expect(putMock).toHaveBeenCalledTimes(1));
    expect(putMock).toHaveBeenCalledWith({
      cards: { dashboard: { hidden: ['devices'] } },
      nav: { hidden: [], placement: {} },
    });
  });

  it('clears the override with an empty body on Reset to team default', async () => {
    resolvedHidden = ['devices'];
    render(wrap(<Preferences />));
    fireEvent.click(screen.getByTestId('prefs-reset'));
    await waitFor(() => expect(putMock).toHaveBeenCalledTimes(1));
    expect(putMock).toHaveBeenCalledWith({});
    // Local state reverts to "all shown".
    expect(screen.getByTestId('prefs-visible-count')).toHaveTextContent('2 of 2 shown');
  });

  it('hides a menu section (writes nav.hidden) on Save', async () => {
    render(wrap(<Preferences />));
    // Uncheck the Inventory section.
    const inv = screen.getByTestId('prefs-section-sec-inventory');
    expect(inv).toBeChecked();
    fireEvent.click(inv);
    fireEvent.click(screen.getByTestId('prefs-save'));
    await waitFor(() => expect(putMock).toHaveBeenCalledTimes(1));
    const body = putMock.mock.calls[0]![0] as { nav: { hidden: string[] } };
    expect(body.nav.hidden).toContain('sec-inventory');
  });

  it('relocates Tag Reads to the top level (writes nav.placement) on Save', async () => {
    render(wrap(<Preferences />));
    // The Tag Reads placement picker defaults to its registry default (Tags);
    // choosing "Top level" records the override.
    const seg = screen.getByTestId('prefs-placement-/tag-reads');
    fireEvent.click(within(seg).getByText('Top level'));
    fireEvent.click(screen.getByTestId('prefs-save'));
    await waitFor(() => expect(putMock).toHaveBeenCalledTimes(1));
    const body = putMock.mock.calls[0]![0] as { nav: { placement: Record<string, string> } };
    expect(body.nav.placement['/tag-reads']).toBe('top');
  });
});
