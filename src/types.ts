// ── Device Registry ──

export interface DeviceCreate {
  name: string;
  device_type?: string;
  metadata?: Record<string, unknown>;
  configuration?: Record<string, unknown>;
  firmware_version?: string;
}

export interface DeviceUpdate {
  name?: string;
  device_type?: string;
  status?: string;
  metadata?: Record<string, unknown>;
  configuration?: Record<string, unknown>;
  firmware_version?: string;
}

export interface DeviceResponse {
  id: string;
  name: string;
  device_type: string;
  status: string;
  metadata: Record<string, unknown> | null;
  configuration: Record<string, unknown> | null;
  firmware_version: string | null;
  connection_state: string;
  last_seen: string | null;
  mobility?: string;
  token_prefix: string | null;
  token_rotated_at: string | null;
  cert_thumbprint?: string | null;
  cert_subject?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeviceTokenResponse {
  device_id: string;
  token: string;
  prefix: string;
  rotated_at: string;
}

// ── Tag Reads ──

export type LocationSource = 'gps' | 'fixed' | 'inferred';

export interface Location {
  latitude: number;
  longitude: number;
  accuracy_m?: number | null;
  source?: LocationSource;
}

export interface Identity {
  epc?: string | null;
  epc_hex?: string | null;
  epc_scheme?: string | null;
  epc_decoded?: Record<string, unknown> | null;
  tid?: string | null;
  user_memory_hex?: string | null;
}

export interface TagReadCreate {
  device_id: string;
  tag_id?: string;
  timestamp: string;
  signal_strength?: number;
  sensor_data?: Record<string, unknown>;
  // Sprint 14
  location?: Location;
  identity?: Identity;
  tag_data?: Record<string, unknown>;
  reader_antenna?: number;
}

export interface TagReadResponse {
  id: string;
  device_id: string;
  tag_id: string;
  timestamp: string;
  signal_strength: number | null;
  sensor_data: Record<string, unknown> | null;
  // Sprint 14 — location columns (migration 016)
  latitude?: number | null;
  longitude?: number | null;
  location_accuracy_m?: number | null;
  location_source?: LocationSource | null;
  // Sprint 14 — RFID identity columns (migration 016)
  epc?: string | null;
  epc_hex?: string | null;
  epc_scheme?: string | null;
  epc_decoded?: Record<string, unknown> | null;
  tid?: string | null;
  user_memory_hex?: string | null;
  tag_data?: Record<string, unknown> | null;
  reader_antenna?: number | null;
  created_at: string;
}

export interface ReadsPerHour {
  bucket: string;
  device_id: string;
  read_count: number;
}

export interface UniqueTagsPerWindow {
  bucket: string;
  device_id: string | null;
  unique_tags: number;
}

// ── Device Health ──

export interface DeviceHealthSummary {
  device_id: string;
  name: string;
  status: string;
  connection_state: string;
  last_seen: string | null;
  reads_last_hour: number;
  error_rate: number;
}

// ── Rules ──

// Sprint 41 Phase F — the union now includes the 13 (event_type, trigger)
// pairs introduced by ADR 021 v2 "Configurable Signaling Events".
// The backend regex (`src/tagpulse/models/rule_schemas.py`
// `_RULE_CONDITION_PATTERN`) and the per-trigger config schemas are the
// authoritative truth; this client-side mirror exists so the discriminated
// union in `SignalingRuleModal` can reject invalid pairs before submit.
export type LegacyConditionType =
  | 'threshold'
  | 'absence'
  | 'rate_change'
  | 'telemetry.threshold'
  | 'stock.below_threshold'
  | 'stock.expiring_within'
  | 'stock.unexpected_in_zone'
  | 'zone.entered'
  | 'zone.exited'
  | 'zone.dwell_exceeded';

export type SignalingEventType = 'location' | 'geolocation' | 'temperature' | 'geofencing';
export type SignalingTrigger =
  | 'on_change'
  | 'periodic'
  | 'on_inactivity'
  | 'on_inference'
  | 'on_entry'
  | 'on_exit';

/**
 * Authoritative map of which `trigger` values are legal for each
 * `event_type`. Kept in sync with backend
 * `SIGNALING_VALID_PAIRS` in `src/tagpulse/models/rule_schemas.py`.
 */
export const SIGNALING_VALID_PAIRS: Readonly<Record<SignalingEventType, readonly SignalingTrigger[]>> = {
  location: ['on_change', 'periodic', 'on_inactivity', 'on_inference'],
  geolocation: ['on_change', 'periodic', 'on_inactivity'],
  temperature: ['on_change', 'periodic', 'on_inactivity'],
  geofencing: ['on_entry', 'on_exit'],
} as const;

export type SignalingConditionType = `signaling.${SignalingEventType}.${SignalingTrigger}`;

export type ConditionType = LegacyConditionType | SignalingConditionType;
export type ActionType = 'webhook' | 'email' | 'notification';

export interface RuleCreate {
  name: string;
  description?: string;
  condition_type: ConditionType;
  condition_config: Record<string, unknown>;
  action_type: ActionType;
  action_config: Record<string, unknown>;
  scope_device_id?: string;
  enabled?: boolean;
  // Sprint 41 Phase A — signaling extensions. Present only when the rule
  // is `kind: 'signaling'` (the backend infers `kind` from `event_type`
  // being non-null on the request body).
  event_type?: SignalingEventType | null;
  trigger?: SignalingTrigger | null;
  processor?: 'isolated_zones' | 'overlapping_zones' | null;
  confidence_threshold?: number | string;
  category_ids?: string[];
  integration_ids?: string[] | null;
}

export interface RuleUpdate {
  name?: string;
  description?: string;
  condition_type?: ConditionType;
  condition_config?: Record<string, unknown>;
  action_type?: ActionType;
  action_config?: Record<string, unknown>;
  scope_device_id?: string;
  enabled?: boolean;
}

export interface RuleResponse {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  condition_type: string;
  condition_config: Record<string, unknown>;
  action_type: string;
  action_config: Record<string, unknown>;
  scope_device_id: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

// ── Alerts ──

export interface AlertResponse {
  id: string;
  tenant_id: string;
  rule_id: string;
  device_id: string | null;
  severity: string;
  message: string;
  context: Record<string, unknown>;
  status: string;
  triggered_at: string;
}

// ── Integrations ──

export type IntegrationType = 'webhook' | 'sse' | 'export';

export interface IntegrationCreate {
  name: string;
  type: IntegrationType;
  events: string[];
  config: Record<string, unknown>;
  filters?: Record<string, unknown>[];
  enrichments?: Record<string, string>;
  enabled?: boolean;
}

export interface IntegrationUpdate {
  name?: string;
  events?: string[];
  config?: Record<string, unknown>;
  filters?: Record<string, unknown>[];
  enrichments?: Record<string, string>;
  enabled?: boolean;
}

export interface IntegrationResponse {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  events: string[];
  config: Record<string, unknown>;
  enabled: boolean;
  status: string;
  health_status: string;
  filters: Record<string, unknown>[] | null;
  enrichments: Record<string, string> | null;
  last_triggered: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryResponse {
  id: string;
  integration_id: string;
  event_type: string;
  status: string;
  attempts: number;
  response_code: number | null;
  error_message: string | null;
  created_at: string;
}

// ── Analytics ──

export interface AnalyticsResultResponse {
  id: string;
  module_name: string;
  device_id: string;
  metric_name: string;
  metric_value: number;
  computed_at: string;
}

// ── Telemetry Models ──

export interface MetricDefinition {
  name: string;
  unit: string;
  min_value?: number;
  max_value?: number;
  description?: string;
}

export interface TelemetryModelCreate {
  device_type: string;
  metrics: MetricDefinition[];
}

export interface TelemetryModelResponse {
  id: string;
  device_type: string;
  metrics: MetricDefinition[];
  created_at: string;
  updated_at: string;
}

// ── Device Telemetry (Sprint 14, device_telemetry hypertable) ──

export interface DeviceTelemetryReading {
  id: string;
  device_id: string;
  timestamp: string;
  metric_name: string;
  metric_value: number;
  unit: string | null;
  /** metadata.source='tag' indicates a tag-borne reading mirrored from tag_reads.tag_data. */
  metadata: Record<string, unknown> | null;
}

export interface TelemetryReadingCreate {
  timestamp: string;
  metric_name: string;
  metric_value: number;
  unit?: string;
  metadata?: Record<string, unknown>;
}

export interface TelemetryBatch {
  device_id: string;
  readings: TelemetryReadingCreate[];
}

// ── Telemetry Quarantine (Sprint 14) ──
//
// `QuarantineReason` is the app-level literal union used by the filter UI.
// The wire shape lives in the generated client as `TelemetryQuarantineResponse`
// (where `reason: string`), produced by `npm run generate-api`.

export type QuarantineReason = 'unknown_metric' | 'out_of_range' | 'unit_mismatch' | 'stale_timestamp';

// ── Usage ──

export interface UsageRecord {
  tenant_id: string;
  usage_date: string;
  dimension: string;
  quantity: number;
  unit: string;
}

export interface UsageSummary {
  tenant_id: string;
  dimension: string;
  total_quantity: number;
  unit: string;
}

// ── Users ──

export interface UserCreate {
  email: string;
  name: string;
  role?: string;
}

export interface UserUpdate {
  name?: string;
  role?: string;
  status?: string;
}

export interface UserResponse {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  api_key_prefix: string | null;
  api_key_created_at: string | null;
  created_at: string;
  last_login: string | null;
}

export interface ApiKeyResponse {
  api_key: string;
  prefix: string;
  message: string;
}

// ── Dashboard summary (Sprint 54.3) ──

export interface DashboardSummary {
  devices_online: number;
  devices_total: number;
  alerts_open_24h: number;
  reads_per_hour_now: number;
  assets_active: number;
  tag_transfers_in_flight: number;
  tag_recon_backlog: number;
  low_stock_count: number;
  tags_total: number;
  sites_total: number;
  zones_total: number;
  generated_at: string;
}
