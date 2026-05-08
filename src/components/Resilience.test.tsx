// Sprint 25 — tests for B1 ApiHealthGate, B2 ErrorBoundary, C1/C2 telemetry.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { ApiHealthGate } from '@/components/ApiHealthGate';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { normalizeRoutePattern } from '@/lib/routes';

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
