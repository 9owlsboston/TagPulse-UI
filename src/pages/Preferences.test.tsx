import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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

// Control the resolved cards.dashboard leaf the page seeds from.
let resolvedHidden: string[] = [];
vi.mock('@/lib/uiConfig', () => ({
  useCardGroup: () => ({ hidden: resolvedHidden, order: [] }),
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
  });

  it('renders a checkbox per dashboard card, seeded from the resolved hidden set', () => {
    resolvedHidden = ['low-stock'];
    render(wrap(<Preferences />));
    // devices visible (checked), low-stock hidden (unchecked).
    expect(screen.getByTestId('prefs-card-devices')).toBeChecked();
    expect(screen.getByTestId('prefs-card-low-stock')).not.toBeChecked();
    expect(screen.getByTestId('prefs-visible-count')).toHaveTextContent('1 of 2 shown');
  });

  it('persists the chosen hidden set via PUT /ui-config/me on Save', async () => {
    render(wrap(<Preferences />));
    // Hide "devices".
    fireEvent.click(screen.getByTestId('prefs-card-devices'));
    fireEvent.click(screen.getByTestId('prefs-save'));
    await waitFor(() => expect(putMock).toHaveBeenCalledTimes(1));
    expect(putMock).toHaveBeenCalledWith({ cards: { dashboard: { hidden: ['devices'] } } });
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
});
