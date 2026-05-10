// Sprint 25 — tests for B1 ApiHealthGate, B2 ErrorBoundary, C1/C2 telemetry,
// and the global 401 interceptor (SWA JWT expiry fix).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { ApiHealthGate } from '@/components/ApiHealthGate';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { normalizeRoutePattern } from '@/lib/routes';
import { handleGlobal401 } from '@/lib/auth';
import { useHealthStatus } from '@/components/ApiHealthGate';
import React from 'react';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ApiHealthGate (B1)', () => {
  it('renders children when /health/live returns 200', async () => {
    fetchMock.mockResolvedValueOnce(new Response('ok', { status: 200 }));
    render(
      <ApiHealthGate>
        <div data-testid="app">App content</div>
      </ApiHealthGate>,
    );
    await waitFor(() => expect(screen.getByTestId('app')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/health/live'),
      expect.objectContaining({ method: 'GET', cache: 'no-store' }),
    );
  });

  it('shows the unreachable banner when the probe fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('network error'));
    render(
      <ApiHealthGate>
        <div data-testid="app">App content</div>
      </ApiHealthGate>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('api-health-unreachable')).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('app')).not.toBeInTheDocument();
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
  });

  it('shows the unreachable banner on non-200 responses', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 503 }));
    render(
      <ApiHealthGate>
        <div data-testid="app">App content</div>
      </ApiHealthGate>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('api-health-unreachable')).toBeInTheDocument(),
    );
  });

  it('surfaces degraded banner via useHealthStatus when /health/ready returns 503 with database down', async () => {
    // 1st fetch: /health/live → 200 (gate passes)
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'alive', version: 'abc1234' }), { status: 200 }),
    );
    // 2nd fetch: /health/ready → 503 with database down
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 'degraded',
          checks: {
            database: { status: 'down', error: 'connection refused' },
            mqtt: { status: 'up', latency_ms: 4.2 },
          },
        }),
        { status: 503 },
      ),
    );

    function Probe(): React.ReactElement {
      const { degraded, degradedReason, degradedDetail } = useHealthStatus();
      return (
        <div>
          <span data-testid="degraded">{String(degraded)}</span>
          <span data-testid="reason">{degradedReason ?? ''}</span>
          <span data-testid="detail">{degradedDetail ?? ''}</span>
        </div>
      );
    }

    render(
      <ApiHealthGate>
        <Probe />
      </ApiHealthGate>,
    );

    await waitFor(() => expect(screen.getByTestId('degraded').textContent).toBe('true'));
    expect(screen.getByTestId('reason').textContent).toBe('database');
    expect(screen.getByTestId('detail').textContent).toContain('connection refused');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/health/ready'),
      expect.objectContaining({ method: 'GET', cache: 'no-store' }),
    );
  });

  it('does not flag degraded when /health/ready returns 200', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'alive', version: 'abc1234' }), { status: 200 }),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 'healthy',
          checks: { database: { status: 'up' }, mqtt: { status: 'up' } },
        }),
        { status: 200 },
      ),
    );

    function Probe(): React.ReactElement {
      const { degraded } = useHealthStatus();
      return <span data-testid="degraded">{String(degraded)}</span>;
    }

    render(
      <ApiHealthGate>
        <Probe />
      </ApiHealthGate>,
    );

    // Wait for both probes to settle.
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('degraded').textContent).toBe('false');
  });
});

describe('ErrorBoundary (B2)', () => {
  function Boom(): never {
    throw new Error('kaboom');
  }

  it('catches render errors and renders the recovery card', () => {
    // Suppress the React error log noise in test output.
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy error details/i })).toBeInTheDocument();
    errSpy.mockRestore();
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="ok">all good</div>
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('ok')).toBeInTheDocument();
  });
});

describe('normalizeRoutePattern (C2)', () => {
  it('replaces UUIDs with :id', () => {
    expect(normalizeRoutePattern('/devices/12345678-1234-1234-1234-123456789abc')).toBe(
      '/devices/:id',
    );
  });

  it('replaces numeric ids ≥3 digits with :id', () => {
    expect(normalizeRoutePattern('/inventory/lots/4242')).toBe('/inventory/lots/:id');
  });

  it('leaves static paths unchanged', () => {
    expect(normalizeRoutePattern('/devices')).toBe('/devices');
    expect(normalizeRoutePattern('/devices/register')).toBe('/devices/register');
  });

  it('handles trailing UUIDs and mid-path UUIDs', () => {
    expect(
      normalizeRoutePattern('/integrations/12345678-1234-1234-1234-123456789abc/deliveries'),
    ).toBe('/integrations/:id/deliveries');
  });
});

describe('telemetry no-op mode (C1)', () => {
  it('initTelemetry is a no-op when VITE_APP_INSIGHTS_CONNECTION_STRING is empty', async () => {
    // Re-import after resetting modules so initTelemetry sees fresh internal state.
    vi.resetModules();
    const mod = await import('@/lib/telemetry');
    mod.__resetTelemetryForTests();
    // No connection string is configured in test env → init is a no-op.
    mod.initTelemetry();
    expect(mod.isTelemetryEnabled()).toBe(false);
    // Public exports are safe to call when disabled.
    expect(() => mod.trackPageView('/test')).not.toThrow();
    expect(() => mod.trackException(new Error('x'))).not.toThrow();
    expect(() =>
      mod.trackDependency({
        name: 'GET /test',
        url: 'http://localhost/test',
        duration: 1,
        resultCode: 200,
        success: true,
      }),
    ).not.toThrow();
  });
});

it('act-warning suppression', () => {
  // Ensure the module exports surface as expected (smoke test).
  expect(typeof act).toBe('function');
});

describe('handleGlobal401 (JWT 401 interceptor)', () => {
  let reloadMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadMock },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).__TAGPULSE_TOKEN__;
    delete (window as unknown as Record<string, unknown>).__TAGPULSE_TENANT_ID__;
    sessionStorage.clear();
    localStorage.clear();
  });

  it('clears session and reloads on 401 when a token is present', () => {
    (window as unknown as Record<string, unknown>).__TAGPULSE_TOKEN__ = 'some-jwt';
    sessionStorage.setItem('tagpulse_token', 'some-jwt');
    sessionStorage.setItem('tagpulse_user', '{}');
    localStorage.setItem('tagpulse_tenant_id', 'tenant-1');

    const error = Object.assign(new Error('Unauthorized'), { status: 401 });
    handleGlobal401(error);

    expect(sessionStorage.getItem('tagpulse_token')).toBeNull();
    expect(sessionStorage.getItem('tagpulse_user')).toBeNull();
    expect(localStorage.getItem('tagpulse_tenant_id')).toBeNull();
    expect(reloadMock).toHaveBeenCalledOnce();
  });

  it('does nothing on non-401 errors', () => {
    (window as unknown as Record<string, unknown>).__TAGPULSE_TOKEN__ = 'some-jwt';
    const error = Object.assign(new Error('Server Error'), { status: 500 });
    handleGlobal401(error);
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('does nothing on 401 when no token is present (tenant-only auth)', () => {
    const error = Object.assign(new Error('Unauthorized'), { status: 401 });
    handleGlobal401(error);
    expect(reloadMock).not.toHaveBeenCalled();
  });
});
