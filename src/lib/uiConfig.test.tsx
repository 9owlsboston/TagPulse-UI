import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { UiConfig } from '@/api/generated/models/UiConfig';
import {
  UiConfigProvider,
  useLabel,
  useNavConfig,
  useCardGroup,
  useThemeConfig,
} from '@/lib/uiConfig';

// Drive the provider off a mocked query so we don't stand up a backend.
const mockUseUiConfig = vi.fn();
vi.mock('@/hooks/useUiConfig', () => ({
  useUiConfig: () => mockUseUiConfig(),
}));

function LabelProbe() {
  return (
    <>
      <span data-testid="device">{useLabel('device')}</span>
      <span data-testid="device-plural">{useLabel('device', { plural: true })}</span>
      <span data-testid="asset">{useLabel('asset')}</span>
    </>
  );
}

describe('useLabel', () => {
  it('returns canonical defaults when no skin is configured', () => {
    const data: UiConfig = { labels: { device: 'Device', asset: 'Asset' } };
    mockUseUiConfig.mockReturnValue({ data });
    render(
      <UiConfigProvider>
        <LabelProbe />
      </UiConfigProvider>,
    );
    expect(screen.getByTestId('device')).toHaveTextContent('Device');
    expect(screen.getByTestId('device-plural')).toHaveTextContent('Devices');
  });

  it('applies the resolved label skin and pluralizes it', () => {
    const data: UiConfig = { labels: { device: 'Reader' } };
    mockUseUiConfig.mockReturnValue({ data });
    render(
      <UiConfigProvider>
        <LabelProbe />
      </UiConfigProvider>,
    );
    expect(screen.getByTestId('device')).toHaveTextContent('Reader');
    expect(screen.getByTestId('device-plural')).toHaveTextContent('Readers');
    // a term the skin omits falls through to its canonical default
    expect(screen.getByTestId('asset')).toHaveTextContent('Asset');
  });

  it('is default-safe without a provider (renders today\'s terms)', () => {
    mockUseUiConfig.mockReturnValue({ data: undefined });
    render(<LabelProbe />);
    expect(screen.getByTestId('device')).toHaveTextContent('Device');
    expect(screen.getByTestId('asset')).toHaveTextContent('Asset');
  });

  it('falls back to defaults while the query is unresolved', () => {
    mockUseUiConfig.mockReturnValue({ data: undefined });
    render(
      <UiConfigProvider>
        <LabelProbe />
      </UiConfigProvider>,
    );
    expect(screen.getByTestId('device-plural')).toHaveTextContent('Devices');
  });
});

function LeafProbe() {
  const nav = useNavConfig();
  const cards = useCardGroup('dashboard');
  const theme = useThemeConfig();
  return (
    <>
      <span data-testid="nav-hidden">{nav.hidden.join(',')}</span>
      <span data-testid="nav-order">{nav.order.join(',')}</span>
      <span data-testid="cards-hidden">{cards.hidden.join(',')}</span>
      <span data-testid="cards-order">{cards.order.join(',')}</span>
      <span data-testid="theme-variant">{theme.variant}</span>
      <span data-testid="theme-card-style">{theme.cardStyle}</span>
    </>
  );
}

describe('nav / cards / theme leaf consumption', () => {
  it('exposes the resolved nav, cards and theme leaves', () => {
    const data: UiConfig = {
      nav: { hidden: ['sec-inventory'], order: ['/', '/alerts'] },
      cards: { dashboard: { hidden: ['low-stock'], order: ['devices'] } },
      theme: { variant: 'operator', cardStyle: 'sparkline' },
    };
    mockUseUiConfig.mockReturnValue({ data });
    render(
      <UiConfigProvider>
        <LeafProbe />
      </UiConfigProvider>,
    );
    expect(screen.getByTestId('nav-hidden')).toHaveTextContent('sec-inventory');
    expect(screen.getByTestId('nav-order')).toHaveTextContent('/,/alerts');
    expect(screen.getByTestId('cards-hidden')).toHaveTextContent('low-stock');
    expect(screen.getByTestId('cards-order')).toHaveTextContent('devices');
    expect(screen.getByTestId('theme-variant')).toHaveTextContent('operator');
    expect(screen.getByTestId('theme-card-style')).toHaveTextContent('sparkline');
  });

  it('returns normalised empty defaults when leaves are absent', () => {
    mockUseUiConfig.mockReturnValue({ data: { labels: { device: 'Reader' } } });
    render(
      <UiConfigProvider>
        <LeafProbe />
      </UiConfigProvider>,
    );
    expect(screen.getByTestId('nav-hidden')).toHaveTextContent('');
    expect(screen.getByTestId('cards-order')).toHaveTextContent('');
    expect(screen.getByTestId('theme-variant')).toHaveTextContent('default');
    expect(screen.getByTestId('theme-card-style')).toHaveTextContent('default');
  });

  it('reflects the resolved theme leaf onto <html> data attributes', () => {
    const data: UiConfig = { theme: { variant: 'power', cardStyle: 'sparkline' } };
    mockUseUiConfig.mockReturnValue({ data });
    render(
      <UiConfigProvider>
        <LeafProbe />
      </UiConfigProvider>,
    );
    expect(document.documentElement.getAttribute('data-ui-variant')).toBe('power');
    expect(document.documentElement.getAttribute('data-card-style')).toBe('sparkline');
  });
});
