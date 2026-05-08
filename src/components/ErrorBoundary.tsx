// Sprint 25 B2 — Root error boundary.
//
// Catches React render errors anywhere below it. Forwards (error, stack,
// componentStack) to App Insights via trackException(). Renders a recovery
// card with a "Copy error details" action and a [Reload] button.
//
// Distinct from <ApiHealthGate />: B1 handles api-down, B2 handles
// SPA-up-but-rendering-broken.

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Result, Typography, message } from 'antd';
import { ReloadOutlined, CopyOutlined } from '@ant-design/icons';
import { trackException } from '@/lib/telemetry';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  componentStack: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
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
    const { error } = this.state;
    if (!error) return this.props.children;

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
          title="Something went wrong"
          subTitle={
            <Typography.Paragraph type="secondary" style={{ maxWidth: 480, margin: '0 auto' }}>
              The page hit an unexpected error. The TagPulse team has been notified. You can copy
              the error details below or reload the page.
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
