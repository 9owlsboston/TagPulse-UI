import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

interface AuthContextValue {
  tenantId: string | null;
  setTenantId: (id: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantIdState] = useState<string | null>(null);

  const setTenantId = useCallback((id: string) => {
    setTenantIdState(id);
    (window as unknown as Record<string, unknown>).__TAGPULSE_TENANT_ID__ = id;
  }, []);

  const logout = useCallback(() => {
    setTenantIdState(null);
    delete (window as unknown as Record<string, unknown>).__TAGPULSE_TENANT_ID__;
  }, []);

  const value = useMemo(() => ({ tenantId, setTenantId, logout }), [tenantId, setTenantId, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
