import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AccountDropdown } from '@/components/AccountDropdown';
import { ThemeProvider } from '@/theme/ThemeProvider';

const logoutMock = vi.fn();

function makeAuth(role: 'admin' | 'editor' | 'viewer') {
  return {
    user:
      role === 'viewer'
        ? null
        : {
            id: 'u1',
            email: 'me@example.com',
            name: 'Alice',
            role,
            tenant_id: 't',
            tenant_name: 'Acme',
          },
    role,
    tenantId: 't',
    logout: logoutMock,
  };
}

let currentRole: 'admin' | 'editor' | 'viewer' = 'admin';
vi.mock('@/lib/auth', () => ({
  useAuth: () => makeAuth(currentRole),
}));

function renderDropdown() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <AccountDropdown />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('AccountDropdown', () => {
  it('shows the user name on the trigger when authenticated', () => {
    currentRole = 'admin';
    renderDropdown();
    expect(screen.getByTestId('account-trigger')).toHaveTextContent('Alice');
  });

  it('exposes admin items + the theme switch when role=admin', () => {
    currentRole = 'admin';
    renderDropdown();
    fireEvent.click(screen.getByTestId('account-trigger'));
    expect(screen.getByText('Tenant Settings')).toBeInTheDocument();
    expect(screen.getByText('Branding')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Audit Log')).toBeInTheDocument();
    expect(screen.getByText('Dead Letters')).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('hides admin items for non-admin roles', () => {
    currentRole = 'editor';
    renderDropdown();
    fireEvent.click(screen.getByTestId('account-trigger'));
    expect(screen.queryByText('Tenant Settings')).not.toBeInTheDocument();
    expect(screen.queryByText('Branding')).not.toBeInTheDocument();
    // Theme toggle + logout still visible for everyone.
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('logout menu click calls auth.logout', () => {
    currentRole = 'admin';
    logoutMock.mockClear();
    renderDropdown();
    fireEvent.click(screen.getByTestId('account-trigger'));
    fireEvent.click(screen.getByText('Logout'));
    expect(logoutMock).toHaveBeenCalledOnce();
  });

  it('falls back to "Viewer" trigger label when no user is loaded', () => {
    currentRole = 'viewer';
    renderDropdown();
    expect(screen.getByTestId('account-trigger')).toHaveTextContent('Viewer');
  });
});
