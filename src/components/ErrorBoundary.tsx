// Sprint 25 B2 — Root error boundary.
//
// Catches React render errors anywhere below it. Forwards (error, stack,
// componentStack) to App Insights via trackException(). Renders a recovery
// card with a "Copy error details" action and a [Reload] button.
//
// Distinct from <ApiHealthGate />: B1 handles api-down, B2 handles
// SPA-up-but-rendering-broken.

import { Component, type ErrorInfo, type ReactNode } from 'react';
import Button from 'antd/es/button';
import Result from 'antd/es/result';
import Spin from 'antd/es/spin';
import Typography from 'antd/es/typography';
import message from 'antd/es/message';
import { ReloadOutlined, CopyOutlined } from '@ant-design/icons';
import { trackException } from '@/lib/telemetry';
import { isChunkLoadError, reloadForChunkError } from '@/lib/lazyWithReload';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  componentStack: string | null;
  // True when the caught error is a stale-chunk / dynamic-import failure
  // (deploy churn), not a genuine render bug.
  isChunk: boolean;
  // null = undetermined (componentDidCatch not run yet), true = reload in
  // flight, false = throttle suppressed the reload (persistent failure).
  reloadAttempted: boolean | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null,
    componentStack: null,
    isChunk: false,
    reloadAttempted: null,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error, isChunk: isChunkLoadError(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (isChunkLoadError(error)) {
      // Stale-chunk after a deploy reached the boundary (e.g. the per-session
      // auto-reload was already spent, or the error came via a path the lazy
      // factory didn't wrap). Recover with a throttled hard reload rather than
      // showing the red error card. This is expected deploy churn, not a bug,
      // so we don't report it as an exception.
      const reloaded = reloadForChunkError();
      this.setState({ reloadAttempted: reloaded });
      if (!reloaded) {
        console.warn('[ErrorBoundary] chunk reload throttled:', error.message);
      }
      return;
    }
    this.setState({ componentStack: info.componentStack ?? null });
    trackException(error, {
      componentStack: info.componentStack ?? '',
      location: typeof window !== 'undefined' ? window.location.pathname : '',
    });
    // Keep a console trace for local dev — App Insights is no-op without a
    // connection string, so devs need to see this somewhere.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleCopy = async (): Promise<void> => {
    const { error, componentStack } = this.state;
    if (!error) return;
    const payload = [
      `Error: ${error.message}`,
      '',
      'Stack:',
      error.stack ?? '(no stack)',
      '',
      'Component stack:',
      componentStack ?? '(no component stack)',
      '',
      `URL: ${window.location.href}`,
      `User-Agent: ${navigator.userAgent}`,
      `Timestamp: ${new Date().toISOString()}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(payload);
      void message.success('Error details copied to clipboard');
    } catch {
      void message.error('Could not copy to clipboard');
    }
  };

  render(): ReactNode {
    const { error, isChunk, reloadAttempted } = this.state;
    if (!error) return this.props.children;

    // Stale-chunk error after a deploy: a hard reload is in flight (or about to
    // be), so show a calm "updating" state instead of the red error card. Only
    // fall through to the card if the throttle suppressed the reload
    // (persistent failure — the chunk is genuinely missing).
    if (isChunk && reloadAttempted !== false) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
          }}
          data-testid="error-boundary-updating"
        >
          <Spin size="large" />
          <Typography.Text type="secondary">Updating to the latest version…</Typography.Text>
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
        data-testid="error-boundary"
      >
        <Result
          status="error"
          title={isChunk ? 'Could not load the latest version' : 'Something went wrong'}
          subTitle={
            <Typography.Paragraph type="secondary" style={{ maxWidth: 480, margin: '0 auto' }}>
              {isChunk
                ? 'A new version was deployed but a fresh copy of this page could not be loaded. Reload to continue.'
                : 'The page hit an unexpected error. The TagPulse team has been notified. You can copy the error details below or reload the page.'}
            </Typography.Paragraph>
          }
          extra={
            <>
              <Typography.Paragraph
                code
                copyable={false}
                style={{ maxWidth: 480, margin: '0 auto 16px', textAlign: 'left' }}
              >
                {error.message}
              </Typography.Paragraph>
              <Button icon={<CopyOutlined />} onClick={this.handleCopy} style={{ marginRight: 8 }}>
                Copy error details
              </Button>
              <Button type="primary" icon={<ReloadOutlined />} onClick={this.handleReload}>
                Reload
              </Button>
            </>
          }
        />
      </div>
    );
  }
}
