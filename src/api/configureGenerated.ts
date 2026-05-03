/**
 * Configure the generated OpenAPI fetch client to use the same auth/tenant
 * window globals as the hand-written `client.ts`. Imported for side-effect
 * from `main.tsx` so every generated service call carries the right headers.
 */
import { OpenAPI } from './generated/core/OpenAPI';

OpenAPI.TOKEN = async () => {
  const token = (window as unknown as Record<string, unknown>).__TAGPULSE_TOKEN__ as string | undefined;
  return token ?? '';
};

OpenAPI.HEADERS = async () => {
  const token = (window as unknown as Record<string, unknown>).__TAGPULSE_TOKEN__ as string | undefined;
  const tenantId = (window as unknown as Record<string, unknown>).__TAGPULSE_TENANT_ID__ as string | undefined;
  // Tenant header is only used for tenant-only (no JWT) auth. When a JWT is
  // present the backend ignores X-Tenant-ID, but sending it is harmless.
  const headers: Record<string, string> = {};
  if (!token && tenantId) {
    headers['X-Tenant-ID'] = tenantId;
  }
  return headers;
};
