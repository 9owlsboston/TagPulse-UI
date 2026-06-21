import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AssetEnvironmentChart } from '@/components/AssetEnvironmentChart';

let mockHistory: unknown[] = [];
let mockLegs: unknown[] = [];
let mockState: unknown = null;

vi.mock('@/hooks/useAssets', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useAssets')>('@/hooks/useAssets');
  return {
    ...actual,
    useAssetStateHistory: () => ({ data: mockHistory }),
    useAssetLegs: () => ({ data: mockLegs }),
    useAssetState: () => ({ data: mockState }),
  };
});

function renderChart() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AssetEnvironmentChart assetId="a1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AssetEnvironmentChart', () => {
  it('shows an empty state when there is no history', () => {
    mockHistory = [];
    mockLegs = [];
    mockState = null;
    renderChart();
    expect(screen.getByText('No environment history yet')).toBeInTheDocument();
  });
});
