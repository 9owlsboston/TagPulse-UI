import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Branding } from '@/pages/admin/Branding';

const updateMutate = vi.fn();
let mockRole: 'admin' | 'editor' | 'viewer' = 'admin';
let mockBranding:
  | {
      brand_color: string | null;
      display_name: string | null;
      logo_url: string | null;
      logo_collapsed_url: string | null;
    }
  | undefined = {
  brand_color: '#112233',
  display_name: 'Acme',
  logo_url: 'https://example.com/logo.svg',
  logo_collapsed_url: null,
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
      logo_collapsed_url: null,
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
    // With a full logo set, the expanded preview renders the logo (alt=name)
    // in place of the text; the collapsed rail falls back to it too.
    expect(screen.getByAltText('Full logo')).toHaveAttribute(
      'src',
      'https://example.com/logo.svg',
    );
  });

  it('shows the display name in the preview when no full logo is set', () => {
    mockBranding = {
      brand_color: '#112233',
      display_name: 'Acme',
      logo_url: null,
      logo_collapsed_url: null,
    };
    render(wrap(<Branding />));
    expect(screen.getByTestId('branding-preview')).toHaveTextContent('Acme');
  });

  it('refuses to render for non-admins', () => {
    mockRole = 'editor';
    render(wrap(<Branding />));
    expect(screen.getByText(/admin-only/i)).toBeInTheDocument();
  });

  it('submits PATCH with trimmed values, sending null for empty fields', async () => {
    mockBranding = {
      brand_color: null,
      display_name: null,
      logo_url: null,
      logo_collapsed_url: null,
    };
    render(wrap(<Branding />));
    const displayName = screen.getByLabelText(/Display name/i);
    fireEvent.change(displayName, { target: { value: '  New Co  ' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    await waitFor(() => expect(updateMutate).toHaveBeenCalled());
    expect(updateMutate).toHaveBeenCalledWith({
      brand_color: null,
      display_name: 'New Co',
      logo_url: null,
      logo_collapsed_url: null,
    });
  });

  it('exposes upload buttons + URL inputs for both logos', () => {
    render(wrap(<Branding />));
    expect(screen.getByTestId('branding-upload-btn-logo_url')).toBeInTheDocument();
    expect(screen.getByTestId('branding-upload-btn-logo_collapsed_url')).toBeInTheDocument();
    expect(screen.getByTestId('branding-input-logo_url')).toBeInTheDocument();
    expect(screen.getByTestId('branding-input-logo_collapsed_url')).toBeInTheDocument();
  });

  it('reads an uploaded file into a data: URL and includes it in the PATCH', async () => {
    mockBranding = {
      brand_color: null,
      display_name: null,
      logo_url: null,
      logo_collapsed_url: null,
    };
    render(wrap(<Branding />));

    // antd Upload renders a hidden <input type="file"> — drive it directly.
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeTruthy();
    const file = new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' });
    fireEvent.change(fileInput!, { target: { files: [file] } });

    // FileReader resolves async → the full-logo URL input picks up the data URL.
    await waitFor(() => {
      expect(screen.getByDisplayValue(/^data:image\/svg\+xml/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    await waitFor(() => expect(updateMutate).toHaveBeenCalled());
    const payload = updateMutate.mock.calls[0]![0] as { logo_url: string | null };
    expect(payload.logo_url?.startsWith('data:image/svg+xml')).toBe(true);
  });
});
