const BASE = '';

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  // Handle 401 from server (e.g. token revoked server-side)
  if (res.status === 401 && token) {
    clearExpiredSession();
    throw new Error('Session expired. Please log in again.');
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
};

// ── Tag Reads ──

export const tagReadsApi = {
  list: (params?: { device_id?: string; tag_id?: string; start?: string; end?: string; limit?: number; offset?: number }) =>
    request<TagReadResponse[]>(`/tag-reads${qs(params ?? {})}`),
  readsPerHour: (params?: { device_id?: string; start?: string; end?: string }) =>
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
  list: (params?: { rule_id?: string; device_id?: string; status?: string; limit?: number; offset?: number }) =>
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

// ── Usage ──

export const usageApi = {
  list: (params?: { start?: string; end?: string }) =>
    request<UsageRecord[]>(`/admin/usage${qs(params ?? {})}`),
  summary: (params?: { start?: string; end?: string }) =>
    request<UsageSummary[]>(`/admin/usage/summary${qs(params ?? {})}`),
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
