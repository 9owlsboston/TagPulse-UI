// Sprint 25 B1 — Startup health gate.
// Sprint 29 — also probe /health/ready to detect "API up but DB down"
// (Postgres Flex auto-stop). See issue #13.
//
// Polls ${VITE_API_BASE_URL}/health/live on mount and on route changes after
// >60s of idle. While the api is unreachable, renders <ApiUnreachable /> with
// exponential-backoff retry. Once a probe succeeds, children render and we
// stay quiet until the idle threshold is crossed again. Whenever live
// succeeds, a follow-up /health/ready probe surfaces dependency-level
// failures (DB / MQTT / migrations) as a non-blocking degraded banner.

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, Button, Result, Spin, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

const LIVE_PATH = '/health/live';
const READY_PATH = '/health/ready';
const IDLE_THRESHOLD_MS = 60_000;
const INITIAL_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;
const PROBE_TIMEOUT_MS = 5_000;
const READY_PROBE_TIMEOUT_MS = 8_000;
// After this many failed live retries, surface an operator hint pointing at
// the most common production cause (Azure PG Flex Burstable auto-stop).
const HINT_AFTER_ATTEMPTS = 3;

type Status = 'probing' | 'ok' | 'unreachable';

export interface VersionInfo {
  apiVersion: string;
  apiBuildTime: string;
  uiVersion: string;
}

export interface HealthStatus {
  /** True when /health/ready returned 503 (any dependency down). */
  degraded: boolean;
  /** Short human-friendly reason, e.g. "database", "mqtt", "migrations". */
  degradedReason: string | null;
  /** Detailed message for the banner, e.g. error from the failing check. */
  degradedDetail: string | null;
}

interface HealthContextValue extends VersionInfo, HealthStatus {}

const HealthContext = createContext<HealthContextValue>({
  apiVersion: 'dev',
  apiBuildTime: '',
  uiVersion: 'dev',
  degraded: false,
  degradedReason: null,
  degradedDetail: null,
});

// eslint-disable-next-line react-refresh/only-export-components
export function useVersionInfo(): VersionInfo {
  const { apiVersion, apiBuildTime, uiVersion } = useContext(HealthContext);
  return { apiVersion, apiBuildTime, uiVersion };
}

// eslint-disable-next-line react-refresh/only-export-components
export function useHealthStatus(): HealthStatus {
  const { degraded, degradedReason, degradedDetail } = useContext(HealthContext);
  return { degraded, degradedReason, degradedDetail };
}

const UI_VERSION = (import.meta.env.VITE_BUILD_VERSION ?? 'dev').slice(0, 7);
const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

interface HealthResponse {
  status: string;
  version?: string;
  build_time?: string;
}

interface ReadinessCheck {
  status: string;
  error?: string;
  latency_ms?: number;
}

interface ReadinessResponse {
  status?: string;
  checks?: Record<string, ReadinessCheck>;
}

async function probeLive(signal: AbortSignal): Promise<HealthResponse | null> {
  try {
    const res = await fetch(`${BASE}${LIVE_PATH}`, {
      method: 'GET',
      cache: 'no-store',
      signal,
    });
    if (!res.ok) return null;
    const body: unknown = await res.json().catch(() => null);
    if (body && typeof body === 'object') return body as HealthResponse;
    return { status: 'alive' };
  } catch {
    return null;
  }
}

interface ReadyResult {
  /** Whether the readiness check returned 200. */
  ok: boolean;
  /** Parsed body if available (200 or 503 both return JSON). */
  body: ReadinessResponse | null;
}

async function probeReady(signal: AbortSignal): Promise<ReadyResult | null> {
  try {
    const res = await fetch(`${BASE}${READY_PATH}`, {
      method: 'GET',
      cache: 'no-store',
      signal,
    });
    const body: unknown = await res.json().catch(() => null);
    const parsed =
      body && typeof body === 'object' ? (body as ReadinessResponse) : null;
    return { ok: res.ok, body: parsed };
  } catch {
    return null;
  }
}

function summarizeReady(result: ReadyResult | null): {
  degraded: boolean;
  reason: string | null;
  detail: string | null;
} {
  // If the ready probe itself failed (network/timeout) we don't claim
  // degraded — the live probe is the authoritative gate. Just stay quiet.
  if (!result) return { degraded: false, reason: null, detail: null };
  if (result.ok) return { degraded: false, reason: null, detail: null };
  const checks = result.body?.checks ?? {};
  const downKeys = Object.entries(checks)
    .filter(([, c]) => c?.status !== 'up')
    .map(([k, c]) => ({ key: k, error: c?.error }));
  if (downKeys.length === 0) {
    return { degraded: true, reason: 'unknown', detail: 'API reports degraded status.' };
  }
  // Prefer database in the headline reason — it's the most actionable.
  // Non-null assertion: downKeys.length > 0 verified above.
  const primary = downKeys.find((d) => d.key === 'database') ?? downKeys[0]!;
  const others = downKeys.filter((d) => d.key !== primary.key).map((d) => d.key);
  const detail = primary.error
    ? `${primary.key}: ${primary.error}`
    : `${primary.key} check failed`;
  const suffix = others.length ? ` (also: ${others.join(', ')})` : '';
  return {
    degraded: true,
    reason: primary.key,
    detail: detail + suffix,
  };
}

interface ApiHealthGateProps {
  children: ReactNode;
}

export function ApiHealthGate({ children }: ApiHealthGateProps): ReactNode {
  const [status, setStatus] = useState<Status>('probing');
  // probeSeq is incremented to trigger the probe effect. Using a monotonic
  // counter instead of `attempt` avoids the bug where setAttempt(0) is a
  // no-op when attempt is already 0 (e.g. after a successful probe + idle
  // re-probe on focus).
  const [probeSeq, setProbeSeq] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [versionInfo, setVersionInfo] = useState<VersionInfo>({
    apiVersion: 'dev',
    apiBuildTime: '',
    uiVersion: UI_VERSION,
  });
  const [health, setHealth] = useState<HealthStatus>({
    degraded: false,
    degradedReason: null,
    degradedDetail: null,
  });
  const lastSuccessRef = useRef<number>(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const runProbe = async (): Promise<void> => {
      const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
      const liveBody = await probeLive(controller.signal);
      clearTimeout(timeoutId);
      if (cancelled) return;
      if (liveBody) {
        lastSuccessRef.current = Date.now();
        setVersionInfo({
          apiVersion: (liveBody.version ?? 'dev').slice(0, 7),
          apiBuildTime: liveBody.build_time ?? '',
          uiVersion: UI_VERSION,
        });
        setStatus('ok');
        setAttempt(0);
        // Fire a follow-up readiness probe to detect "API up but DB down".
        // Use a separate AbortController so the cleanup above doesn't kill it
        // (we only abort the live probe on unmount; ready continues briefly).
        const readyController = new AbortController();
        const readyTimeout = setTimeout(
          () => readyController.abort(),
          READY_PROBE_TIMEOUT_MS,
        );
        const readyResult = await probeReady(readyController.signal);
        clearTimeout(readyTimeout);
        if (cancelled) return;
        const summary = summarizeReady(readyResult);
        setHealth({
          degraded: summary.degraded,
          degradedReason: summary.reason,
          degradedDetail: summary.detail,
        });
      } else {
        setStatus('unreachable');
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (cap).
        const delay = Math.min(INITIAL_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
        retryTimerRef.current = setTimeout(() => {
          if (!cancelled) {
            setAttempt((a) => a + 1);
            setProbeSeq((s) => s + 1);
          }
        }, delay);
      }
    };

    void runProbe();

    return () => {
      cancelled = true;
      controller.abort();
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [probeSeq]); // eslint-disable-line react-hooks/exhaustive-deps

  // Idle re-probe: when the tab regains focus after >60s of last success.
  useEffect(() => {
    const onFocus = (): void => {
      const idleFor = Date.now() - lastSuccessRef.current;
      if (status === 'ok' && idleFor > IDLE_THRESHOLD_MS) {
        setStatus('probing');
        setAttempt(0);
        setProbeSeq((s) => s + 1);
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [status]);

  const handleManualRetry = (): void => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    setStatus('probing');
    setAttempt(0);
    setProbeSeq((s) => s + 1);
  };

  if (status === 'ok') {
    const ctxValue: HealthContextValue = { ...versionInfo, ...health };
    return <HealthContext.Provider value={ctxValue}>{children}</HealthContext.Provider>;
  }

  if (status === 'probing' && attempt === 0) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        data-testid="api-health-probing"
      >
        <Spin size="large" />
      </div>
    );
  }

  const showOpsHint = attempt + 1 >= HINT_AFTER_ATTEMPTS;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      data-testid="api-health-unreachable"
    >
      <Result
        status="warning"
        title="TagPulse is temporarily unavailable"
        subTitle={
          <Typography.Paragraph type="secondary" style={{ maxWidth: 480, margin: '0 auto' }}>
            We can&rsquo;t reach the TagPulse API right now. Retrying automatically&hellip;
          </Typography.Paragraph>
        }
        extra={
          <>
            <Alert
              type="info"
              showIcon
              message={`Retry attempt ${attempt + 1}`}
              style={{ marginBottom: 16, maxWidth: 480, margin: '0 auto 16px' }}
            />
            {showOpsHint && (
              <Alert
                type="warning"
                showIcon
                data-testid="api-health-ops-hint"
                message="Heads up for operators"
                description={
                  <span>
                    The API health endpoint hasn&rsquo;t responded for several attempts. The
                    most common cause in dev is the Azure Postgres Flex Burstable server
                    auto-stopping after ~7 days of idle. Check the database state in
                    resource group <code>tagpulse-dev-rg</code> (server <code>tpdev-pg-mwig6fst</code>)
                    and start it if it&rsquo;s in the Stopped state.
                  </span>
                }
                style={{ marginBottom: 16, maxWidth: 480, margin: '0 auto 16px', textAlign: 'left' }}
              />
            )}
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={handleManualRetry}
              loading={status === 'probing'}
            >
              Retry now
            </Button>
          </>
        }
      />
    </div>
  );
}
