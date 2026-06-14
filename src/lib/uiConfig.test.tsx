import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { UiConfig } from '@/api/generated/models/UiConfig';
import { UiConfigProvider, useLabel } from '@/lib/uiConfig';

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
