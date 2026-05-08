// Sprint 25 B1 — Startup health gate.
//
// Polls ${VITE_API_BASE_URL}/health/live on mount and on route changes after
// >60s of idle. While the api is unreachable, renders <ApiUnreachable /> with
// exponential-backoff retry. Once a probe succeeds, children render and we
// stay quiet until the idle threshold is crossed again.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, Button, Result, Spin, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

const HEALTH_PATH = '/health/live';
const IDLE_THRESHOLD_MS = 60_000;
const INITIAL_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;
const PROBE_TIMEOUT_MS = 5_000;

type Status = 'probing' | 'ok' | 'unreachable';

const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

async function probeHealth(signal: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}${HEALTH_PATH}`, {
      method: 'GET',
      cache: 'no-store',
      signal,
    });
    return res.ok;
  } catch {
    return false;
  }
}

interface ApiHealthGateProps {
  children: ReactNode;
}

export function ApiHealthGate({ children }: ApiHealthGateProps): ReactNode {
  const [status, setStatus] = useState<Status>('probing');
  const [attempt, setAttempt] = useState(0);
  const lastSuccessRef = useRef<number>(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const runProbe = async (): Promise<void> => {
      const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
      const ok = await probeHealth(controller.signal);
      clearTimeout(timeoutId);
      if (cancelled) return;
      if (ok) {
        lastSuccessRef.current = Date.now();
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
    return children;
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
