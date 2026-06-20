// Build-time API base URL. Empty string in local dev → relative paths hit the
// Vite proxy (vite.config.ts). In deployed builds, set VITE_API_BASE_URL to
// the api origin, e.g. https://tpdev-api.<random>.<region>.azurecontainerapps.io.
const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

import { trackDependency } from '@/lib/telemetry';

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length < 2 || !parts[1]) return true;
    const payload = JSON.parse(atob(parts[1]));
    return payload.exp ? Date.now() / 1000 > payload.exp : true;
  } catch {
    return true;
  }
}

function clearExpiredSession(): void {
  sessionStorage.removeItem('tagpulse_token');
  sessionStorage.removeItem('tagpulse_user');
  localStorage.removeItem('tagpulse_tenant_id');
  delete (window as unknown as Record<string, unknown>).__TAGPULSE_TOKEN__;
  delete (window as unknown as Record<string, unknown>).__TAGPULSE_TENANT_ID__;
  window.location.reload();
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = (window as unknown as Record<string, unknown>).__TAGPULSE_TOKEN__ as string | undefined;
  const tenantId = (window as unknown as Record<string, unknown>).__TAGPULSE_TENANT_ID__ as string | undefined;

  // Check JWT expiry before making request
  if (token && isTokenExpired(token)) {
    clearExpiredSession();
    throw new Error('Session expired. Please log in again.');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (tenantId) {
    headers['X-Tenant-ID'] = tenantId;
  }
  const url = `${BASE}${path}`;
  const startedAt = performance.now();
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (err) {
    trackDependency({
      name: `${init?.method ?? 'GET'} ${path.split('?')[0]}`,
      url,
      duration: performance.now() - startedAt,
      resultCode: 0,
      success: false,
    });
    throw err;
  }
  trackDependency({
    name: `${init?.method ?? 'GET'} ${path.split('?')[0]}`,
    url,
    duration: performance.now() - startedAt,
    resultCode: res.status,
    success: res.ok,
  });
  // Handle 401 from server (e.g. token revoked server-side, or stale
  // session after page reload where token was cleared but tenantId persisted).
  if (res.status === 401) {
    // Only clear + reload when there's an active session. Avoids clearing
    // on truly anonymous / tenant-only-login-validation requests.
    const hasSession = !!(token || sessionStorage.getItem('tagpulse_token') || sessionStorage.getItem('tagpulse_user'));
    if (hasSession) {
      clearExpiredSession();
      throw new Error('Session expired. Please log in again.');
    }
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params).filter(
    (e): e is [string, string | number | boolean] => e[1] !== undefined,
  );
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

// ── Devices ──

import type {
  DeviceCreate,
  DeviceUpdate,
  DeviceResponse,
  DeviceTokenResponse,
  TagReadResponse,
  ReadsPerHour,
  UniqueTagsPerWindow,
  DeviceHealthSummary,
  RuleCreate,
  RuleUpdate,
  RuleResponse,
  AlertResponse,
  IntegrationCreate,
  IntegrationUpdate,
  IntegrationResponse,
  DeliveryResponse,
  AnalyticsResultResponse,
  TelemetryModelCreate,
  TelemetryModelResponse,
  DeviceTelemetryReading,
  UsageRecord,
  UsageSummary,
  UserCreate,
  UserUpdate,
  UserResponse,
  ApiKeyResponse,
} from '@/types';

export const devicesApi = {
  list: (params?: { status?: string; device_type?: string; limit?: number; offset?: number }) =>
    request<DeviceResponse[]>(`/device-registry${qs(params ?? {})}`),
  get: (id: string) => request<DeviceResponse>(`/device-registry/${id}`),
  create: (data: DeviceCreate) =>
    request<DeviceResponse>('/device-registry', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: DeviceUpdate) =>
    request<DeviceResponse>(`/device-registry/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  decommission: (id: string) =>
    request<DeviceResponse>(`/device-registry/${id}/decommission`, { method: 'POST' }),
  rotateToken: (id: string) =>
    request<DeviceTokenResponse>(`/device-registry/${id}/rotate-token`, { method: 'POST' }),
};

// ── Tag Reads ──

export const tagReadsApi = {
  list: (params?: { device_id?: string; tag_id?: string; tag_q?: string; start?: string; end?: string; limit?: number; offset?: number }) =>
    request<TagReadResponse[]>(`/tag-reads${qs(params ?? {})}`),
  readsPerHour: (params?: { device_id?: string; start?: string; end?: string; bucket_minutes?: number }) =>
    request<ReadsPerHour[]>(`/tag-reads/reads-per-hour${qs(params ?? {})}`),
  uniqueTags: (params?: { device_id?: string; start?: string; end?: string; window_minutes?: number }) =>
    request<UniqueTagsPerWindow[]>(`/tag-reads/unique-tags${qs(params ?? {})}`),
  recentReads: (deviceId: string, limit?: number) =>
    request<TagReadResponse[]>(`/telemetry/${deviceId}/recent-reads${qs({ limit })}`),
};

// ── Device Health ──

export const deviceHealthApi = {
  list: (status?: string) => request<DeviceHealthSummary[]>(`/device-health${qs({ status })}`),
  get: (deviceId: string) => request<DeviceHealthSummary>(`/device-health/${deviceId}`),
};

// ── Rules ──

export const rulesApi = {
  list: (enabledOnly?: boolean) => request<RuleResponse[]>(`/rules${qs({ enabled_only: enabledOnly })}`),
  get: (id: string) => request<RuleResponse>(`/rules/${id}`),
  create: (data: RuleCreate) =>
    request<RuleResponse>('/rules', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: RuleUpdate) =>
    request<RuleResponse>(`/rules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/rules/${id}`, { method: 'DELETE' }),
};

// ── Alerts ──

export const alertsApi = {
  list: (params?: { rule_id?: string; device_id?: string; status?: string; q?: string; limit?: number; offset?: number }) =>
    request<AlertResponse[]>(`/alerts${qs(params ?? {})}`),
  acknowledge: (id: string) => request<void>(`/alerts/${id}/acknowledge`, { method: 'POST' }),
};

// ── Integrations ──

export const integrationsApi = {
  list: () => request<IntegrationResponse[]>('/integrations'),
  get: (id: string) => request<IntegrationResponse>(`/integrations/${id}`),
  create: (data: IntegrationCreate) =>
    request<IntegrationResponse>('/integrations', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: IntegrationUpdate) =>
    request<IntegrationResponse>(`/integrations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/integrations/${id}`, { method: 'DELETE' }),
  deliveries: (id: string, params?: { limit?: number; offset?: number }) =>
    request<DeliveryResponse[]>(`/integrations/${id}/deliveries${qs(params ?? {})}`),
};

// ── Analytics ──

export const analyticsApi = {
  readFrequency: (params?: { device_id?: string; start?: string; end?: string; metric?: string; limit?: number }) =>
    request<AnalyticsResultResponse[]>(`/analytics/read-frequency${qs(params ?? {})}`),
};

// ── Telemetry Models ──

export const telemetryModelsApi = {
  list: () => request<TelemetryModelResponse[]>('/telemetry-models'),
  get: (deviceType: string) => request<TelemetryModelResponse>(`/telemetry-models/${deviceType}`),
  create: (data: TelemetryModelCreate) =>
    request<TelemetryModelResponse>('/telemetry-models', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/telemetry-models/${id}`, { method: 'DELETE' }),
};

// ── Device Telemetry (Sprint 14, /telemetry hypertable query) ──

export const telemetryApi = {
  list: (params?: {
    device_id?: string;
    metric_name?: string;
    start?: string;
    end?: string;
    limit?: number;
  }) => request<DeviceTelemetryReading[]>(`/telemetry${qs(params ?? {})}`),
};
// Telemetry quarantine moved to the generated client; see
// `TelemetryService.listTelemetryQuarantineTelemetryQuarantineGet` consumed
// from `useTelemetry.useTelemetryQuarantine`.

// ── Usage ──

export const usageApi = {
  list: (params?: { start?: string; end?: string }) =>
    request<UsageRecord[]>(`/admin/usage${qs(params ?? {})}`),
  summary: (params?: { start?: string; end?: string }) =>
    request<UsageSummary[]>(`/admin/usage/summary${qs(params ?? {})}`),
};

// ── Audit Logs ──

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  changes: Record<string, unknown> | null;
  created_at: string;
}

export const auditLogsApi = {
  list: (params?: {
    resource_type?: string;
    actions?: string;
    limit?: number;
    offset?: number;
  }) => request<AuditLogEntry[]>(`/admin/audit-logs${qs(params ?? {})}`),
};

// ── Users ──

export const usersApi = {
  list: () => request<UserResponse[]>('/users'),
  get: (id: string) => request<UserResponse>(`/users/${id}`),
  create: (data: UserCreate) =>
    request<UserResponse>('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: UserUpdate) =>
    request<UserResponse>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  generateApiKey: (id: string) =>
    request<ApiKeyResponse>(`/users/${id}/api-key`, { method: 'POST' }),
  revokeApiKey: (id: string) =>
    request<void>(`/users/${id}/api-key`, { method: 'DELETE' }),
};

// ── Integrations: test-fire (Sprint 27, C2) ──

export const integrationTestApi = {
  test: (id: string) =>
    request<{ status_code: number; response_time_ms: number; body?: string }>(`/integrations/${id}/test`, { method: 'POST' }),
};

// ── Dead-letter events (Sprint 27, C5) ──

interface DeadLetterEvent {
  id: string;
  topic: string;
  error: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export const deadLetterApi = {
  list: () => request<DeadLetterEvent[]>('/admin/dead-letter'),
  retry: (id: string) => request<void>(`/admin/dead-letter/${id}/retry`, { method: 'POST' }),
  abandon: (id: string) => request<void>(`/admin/dead-letter/${id}`, { method: 'DELETE' }),
};

// ── Stock movements: create (Sprint 27, A4) ──

export interface StockMovementCreate {
  product_id: string;
  lot_id?: string;
  zone_id?: string;
  movement_type: 'enter' | 'exit';
  quantity: number;
  reason?: string;
}

export const stockMovementsApi = {
  create: (data: StockMovementCreate) =>
    request<unknown>('/stock-movements', { method: 'POST', body: JSON.stringify(data) }),
};

// ── Lots: update (Sprint 27, A1) ──

export interface LotUpdate {
  lot_code?: string;
  manufactured_at?: string | null;
  expires_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

export const lotsApi = {
  update: (id: string, data: LotUpdate) =>
    request<unknown>(`/lots/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ── Products: update (Sprint 27, A2) ──

export interface ProductUpdateManual {
  name?: string;
  sku?: string;
  gtin?: string | null;
  category?: string | null;
  unit?: string;
  attributes?: Record<string, unknown> | null;
}

export const productsApi = {
  update: (id: string, data: ProductUpdateManual) =>
    request<unknown>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ── Stock items: update state (Sprint 27, A3) ──

export const stockItemsApi = {
  updateState: (id: string, state: string) =>
    request<unknown>(`/stock-items/${id}`, { method: 'PATCH', body: JSON.stringify({ state }) }),
};

// ── Tag-data mappings: update (Sprint 27, A6) ──

export interface TagDataMappingUpdate {
  tag_data_key?: string;
  semantic_field?: string;
  transform?: string | null;
}

export const tagDataMappingsApi = {
  update: (id: string, data: TagDataMappingUpdate) =>
    request<unknown>(`/tag-data-mappings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ── Dashboard summary ──

export const dashboardApi = {
  summary: () => request<import('@/types').DashboardSummary>('/dashboard/summary'),
  sparklines: (days = 7, bucketHours = 6) =>
    request<import('@/types').DashboardSparklines>(
      `/dashboard/sparklines?days=${days}&bucket_hours=${bucketHours}`,
    ),
};
