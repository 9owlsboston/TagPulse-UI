// Sprint 25 B1 — Startup health gate.
//
// Polls ${VITE_API_BASE_URL}/health/live on mount and on route changes after
// >60s of idle. While the api is unreachable, renders <ApiUnreachable /> with
// exponential-backoff retry. Once a probe succeeds, children render and we
// stay quiet until the idle threshold is crossed again.

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, Button, Result, Spin, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

const HEALTH_PATH = '/health/live';
const IDLE_THRESHOLD_MS = 60_000;
const INITIAL_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;
const PROBE_TIMEOUT_MS = 5_000;

type Status = 'probing' | 'ok' | 'unreachable';

export interface VersionInfo {
  apiVersion: string;
  apiBuildTime: string;
  uiVersion: string;
}

const VersionContext = createContext<VersionInfo>({
  apiVersion: 'dev',
  apiBuildTime: '',
  uiVersion: 'dev',
});

// eslint-disable-next-line react-refresh/only-export-components
export function useVersionInfo(): VersionInfo {
  return useContext(VersionContext);
}

const UI_VERSION = (import.meta.env.VITE_BUILD_VERSION ?? 'dev').slice(0, 7);
const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

interface HealthResponse {
  status: string;
  version?: string;
  build_time?: string;
}

async function probeHealth(signal: AbortSignal): Promise<HealthResponse | null> {
  try {
    const res = await fetch(`${BASE}${HEALTH_PATH}`, {
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

interface ApiHealthGateProps {
  children: ReactNode;
}

export function ApiHealthGate({ children }: ApiHealthGateProps): ReactNode {
  const [status, setStatus] = useState<Status>('probing');
  const [attempt, setAttempt] = useState(0);
  const [versionInfo, setVersionInfo] = useState<VersionInfo>({
    apiVersion: 'dev',
    apiBuildTime: '',
    uiVersion: UI_VERSION,
  });
  const lastSuccessRef = useRef<number>(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const runProbe = async (): Promise<void> => {
      const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
      const health = await probeHealth(controller.signal);
      clearTimeout(timeoutId);
      if (cancelled) return;
      if (health) {
        lastSuccessRef.current = Date.now();
        setVersionInfo({
          apiVersion: (health.version ?? 'dev').slice(0, 7),
          apiBuildTime: health.build_time ?? '',
          uiVersion: UI_VERSION,
        });
        setStatus('ok');
        setAttempt(0);
      } else {
        setStatus('unreachable');
        // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (cap).
        const delay = Math.min(INITIAL_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
        retryTimerRef.current = setTimeout(() => {
          if (!cancelled) setAttempt((a) => a + 1);
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
  }, [attempt]);

  // Idle re-probe: when the tab regains focus after >60s of last success.
  useEffect(() => {
    const onFocus = (): void => {
      const idleFor = Date.now() - lastSuccessRef.current;
      if (status === 'ok' && idleFor > IDLE_THRESHOLD_MS) {
        setStatus('probing');
        setAttempt(0);
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
  };

  if (status === 'ok') {
    return <VersionContext.Provider value={versionInfo}>{children}</VersionContext.Provider>;
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
