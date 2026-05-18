import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Branding } from '@/pages/admin/Branding';

const updateMutate = vi.fn();
let mockRole: 'admin' | 'editor' | 'viewer' = 'admin';
let mockBranding: { brand_color: string | null; display_name: string | null; logo_url: string | null } | undefined = {
  brand_color: '#112233',
  display_name: 'Acme',
  logo_url: 'https://example.com/logo.svg',
};

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ role: mockRole }),
}));

vi.mock('@/hooks/useTenantBranding', () => ({
  useTenantBranding: () => ({ data: mockBranding, isLoading: false }),
  useUpdateTenantBranding: () => ({ mutateAsync: updateMutate, isPending: false }),
}));

function wrap(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{node}</QueryClientProvider>;
}

describe('Branding page', () => {
  beforeEach(() => {
    updateMutate.mockReset();
    updateMutate.mockResolvedValue({});
    mockRole = 'admin';
    mockBranding = {
      brand_color: '#112233',
      display_name: 'Acme',
      logo_url: 'https://example.com/logo.svg',
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form populated from /tenant/branding', () => {
    render(wrap(<Branding />));
    expect(screen.getByDisplayValue('Acme')).toBeInTheDocument();
    expect(screen.getByDisplayValue('#112233')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://example.com/logo.svg')).toBeInTheDocument();
    expect(screen.getByTestId('branding-preview')).toHaveTextContent('Acme');
  });

  it('refuses to render for non-admins', () => {
    mockRole = 'editor';
    render(wrap(<Branding />));
    expect(screen.getByText(/admin-only/i)).toBeInTheDocument();
  });

  it('submits PATCH with trimmed values, sending null for empty fields', async () => {
    mockBranding = { brand_color: null, display_name: null, logo_url: null };
    render(wrap(<Branding />));
    const displayName = screen.getByLabelText(/Display name/i);
    fireEvent.change(displayName, { target: { value: '  New Co  ' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    await waitFor(() => expect(updateMutate).toHaveBeenCalled());
    expect(updateMutate).toHaveBeenCalledWith({
      brand_color: null,
      display_name: 'New Co',
      logo_url: null,
    });
  });
});
