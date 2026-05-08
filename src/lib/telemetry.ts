// Sprint 25 C1 — App Insights browser SDK wrapper.
//
// Initialized once from main.tsx before <App /> mounts. Reads the connection
// string from VITE_APP_INSIGHTS_CONNECTION_STRING (build-time, surfaced by
// scripts/ui-cicd-setup.sh from the backend's appInsightsConnectionString
// Bicep output). When the variable is empty (local dev or unconfigured CI),
// every export becomes a no-op so the rest of the app can call them safely.
//
// Privacy:
//   - disableCookiesUsage: true     → no AI_* cookies, no session tracking
//   - isStorageUseDisabled: true    → no localStorage / sessionStorage writes
//   - disableTelemetry: false       → telemetry still flows, just anonymous
//   - URL query strings are stripped from page-view URIs to avoid bleeding
//     tag IDs / lot codes into telemetry.

import { ApplicationInsights, type ITelemetryItem } from '@microsoft/applicationinsights-web';

let appInsights: ApplicationInsights | null = null;

function stripQueryString(uri: string | undefined): string | undefined {
  if (!uri) return uri;
  const i = uri.indexOf('?');
  return i === -1 ? uri : uri.slice(0, i);
}

export function initTelemetry(): void {
  // Read at call-time (not module-load) so tests can stub import.meta.env.
  const connectionString = import.meta.env.VITE_APP_INSIGHTS_CONNECTION_STRING ?? '';
  if (!connectionString) {
    // No connection string → no-op mode. This is the local-dev / unconfigured-CI path.
    return;
  }
  if (appInsights) {
    // Idempotent: re-init in dev HMR shouldn't produce duplicate trackers.
    return;
  }

  appInsights = new ApplicationInsights({
    config: {
      connectionString,
      disableCookiesUsage: true,
      isStorageUseDisabled: true,
      enableAutoRouteTracking: false, // we wire route changes manually in C2
      disableFetchTracking: false,
      disableAjaxTracking: false,
      autoTrackPageVisitTime: true,
      enableCorsCorrelation: true,
    },
  });
  appInsights.loadAppInsights();

  // Strip query strings from outgoing telemetry URIs.
  appInsights.addTelemetryInitializer((item: ITelemetryItem) => {
    if (item.baseData) {
      if (typeof item.baseData.uri === 'string') {
        item.baseData.uri = stripQueryString(item.baseData.uri);
      }
      if (typeof item.baseData.refUri === 'string') {
        item.baseData.refUri = stripQueryString(item.baseData.refUri);
      }
    }
    return true;
  });

  appInsights.trackPageView();
}

export function trackPageView(name: string, uri?: string): void {
  if (!appInsights) return;
  appInsights.trackPageView({ name, uri: stripQueryString(uri) });
}

export function trackException(error: Error, properties?: Record<string, unknown>): void {
  if (!appInsights) return;
  appInsights.trackException({
    exception: error,
    properties: properties as Record<string, string> | undefined,
  });
}

export function trackDependency(args: {
  name: string;
  url: string;
  duration: number;
  resultCode: number;
  success: boolean;
}): void {
  if (!appInsights) return;
  appInsights.trackDependencyData({
    id: crypto.randomUUID(),
    name: args.name,
    target: new URL(args.url, window.location.origin).host,
    duration: args.duration,
    responseCode: args.resultCode,
    success: args.success,
    type: 'Fetch',
    data: stripQueryString(args.url) ?? args.url,
  });
}

export function isTelemetryEnabled(): boolean {
  return appInsights !== null;
}

// Test-only: reset internal state so each test runs in isolation.
export function __resetTelemetryForTests(): void {
  appInsights = null;
}
