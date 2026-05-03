import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  tenant_id: string;
  tenant_name: string;
}

interface AuthContextValue {
  tenantId: string | null;
  user: AuthUser | null;
  role: 'admin' | 'editor' | 'viewer';
  accessToken: string | null;
  isAuthenticated: boolean;
  loginWithApiKey: (email: string, apiKey: string) => Promise<void>;
  loginWithTenantId: (id: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function parseJwtExp(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2 || !parts[1]) return null;
    const payload = JSON.parse(atob(parts[1]));
    return (payload.exp as number) ?? null;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const exp = parseJwtExp(token);
  if (exp === null) return true;
  return Date.now() / 1000 > exp;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantIdState] = useState<string | null>(() => {
    const stored = localStorage.getItem('tagpulse_tenant_id');
    if (stored) {
      (window as unknown as Record<string, unknown>).__TAGPULSE_TENANT_ID__ = stored;
    }
    return stored;
  });

  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = sessionStorage.getItem('tagpulse_user');
    return stored ? (JSON.parse(stored) as AuthUser) : null;
  });

  const [accessToken, setAccessToken] = useState<string | null>(() => {
    const stored = sessionStorage.getItem('tagpulse_token');
    if (stored && !isTokenExpired(stored)) {
      (window as unknown as Record<string, unknown>).__TAGPULSE_TOKEN__ = stored;
      return stored;
    }
    // Clear expired token
    if (stored) {
      sessionStorage.removeItem('tagpulse_token');
      sessionStorage.removeItem('tagpulse_user');
    }
    return null;
  });

  const loginWithTenantId = useCallback((id: string) => {
    setTenantIdState(id);
    setUser(null);
    setAccessToken(null);
    localStorage.setItem('tagpulse_tenant_id', id);
    sessionStorage.removeItem('tagpulse_token');
    sessionStorage.removeItem('tagpulse_user');
    (window as unknown as Record<string, unknown>).__TAGPULSE_TENANT_ID__ = id;
    delete (window as unknown as Record<string, unknown>).__TAGPULSE_TOKEN__;
  }, []);

  const loginWithApiKey = useCallback(async (email: string, apiKey: string) => {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, api_key: apiKey }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(body.detail ?? `Login failed (${res.status})`);
    }
    const data = await res.json();
    const authUser: AuthUser = data.user;
    const token: string = data.access_token;

    setUser(authUser);
    setAccessToken(token);
    setTenantIdState(authUser.tenant_id);

    sessionStorage.setItem('tagpulse_token', token);
    sessionStorage.setItem('tagpulse_user', JSON.stringify(authUser));
    localStorage.setItem('tagpulse_tenant_id', authUser.tenant_id);
    (window as unknown as Record<string, unknown>).__TAGPULSE_TENANT_ID__ = authUser.tenant_id;
    (window as unknown as Record<string, unknown>).__TAGPULSE_TOKEN__ = token;
  }, []);

  const logout = useCallback(() => {
    setTenantIdState(null);
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('tagpulse_tenant_id');
    sessionStorage.removeItem('tagpulse_token');
    sessionStorage.removeItem('tagpulse_user');
    delete (window as unknown as Record<string, unknown>).__TAGPULSE_TENANT_ID__;
    delete (window as unknown as Record<string, unknown>).__TAGPULSE_TOKEN__;
  }, []);

  const role = user?.role ?? 'viewer';
  const isAuthenticated = tenantId !== null;

  const value = useMemo(
    () => ({ tenantId, user, role, accessToken, isAuthenticated, loginWithApiKey, loginWithTenantId, logout }),
    [tenantId, user, role, accessToken, isAuthenticated, loginWithApiKey, loginWithTenantId, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Safe default used when `useAuth` is called outside an AuthProvider — most
// notably in unit tests that render a single page without the full app shell.
// Defaults to an unauthenticated `viewer` so role-gated UI stays hidden, which
// matches what an unauthenticated user would see in production.
const DEFAULT_AUTH: AuthContextValue = {
  tenantId: null,
  user: null,
  role: 'viewer',
  accessToken: null,
  isAuthenticated: false,
  loginWithApiKey: async () => {
    throw new Error('AuthProvider missing');
  },
  loginWithTenantId: () => {
    throw new Error('AuthProvider missing');
  },
  logout: () => {
    throw new Error('AuthProvider missing');
  },
};

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  return ctx ?? DEFAULT_AUTH;
}
