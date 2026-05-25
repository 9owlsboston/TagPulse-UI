/**
 * /dev/tokens — Sprint 54 Phase 54.1 acceptance artifact (ADR-029).
 *
 * Renders every semantic token side-by-side in both themes so we can
 * eyeball drift, regressions, and contrast. The right column forces
 * the opposite theme via a scoped `data-theme` attribute on the
 * preview container — `tokens.css` selectors target both `:root` and
 * `[data-theme=…]`, so any descendant inherits the override.
 *
 * Not linked from the main nav. Reachable only at `/dev/tokens`.
 */
import { useEffect, useState } from 'react';
import Card from 'antd/es/card';
import Space from 'antd/es/space';
import Typography from 'antd/es/typography';
import { semanticRoles } from '@/theme/tokens';
import { useThemeMode } from '@/theme/ThemeProvider';
import type { ThemeMode } from '@/theme/themeMode';

const { Title, Text, Paragraph } = Typography;

function resolveVar(name: string, container: HTMLElement | null): string {
  if (!container) return '';
  return getComputedStyle(container).getPropertyValue(name).trim();
}

function ThemePreview({ mode }: { mode: ThemeMode }) {
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  // Force re-resolve on mount so the swatches show real computed values.
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    if (containerRef) forceUpdate((n) => n + 1);
  }, [containerRef]);

  return (
    <div
      ref={setContainerRef}
      data-theme={mode}
      data-testid={`tokens-preview-${mode}`}
      style={{
        background: 'var(--color-bg)',
        color: 'var(--color-text)',
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        padding: 16,
      }}
    >
      <Title level={4} style={{ color: 'var(--color-text)', marginTop: 0 }}>
        {mode}
      </Title>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          gap: '8px 16px',
          alignItems: 'center',
        }}
      >
        {semanticRoles.map((role) => {
          const value = resolveVar(role.cssVar, containerRef);
          return (
            <Swatch
              key={role.name}
              name={role.name}
              cssVar={role.cssVar}
              description={role.description}
              value={value}
            />
          );
        })}
      </div>
    </div>
  );
}

function Swatch({
  name,
  cssVar,
  description,
  value,
}: {
  name: string;
  cssVar: string;
  description: string;
  value: string;
}) {
  return (
    <>
      <div
        data-testid={`swatch-${name}`}
        style={{
          width: 56,
          height: 32,
          background: `var(${cssVar})`,
          border: '1px solid var(--color-border)',
          borderRadius: 4,
        }}
        title={value}
      />
      <div style={{ minWidth: 0 }}>
        <Text strong style={{ color: 'var(--color-text)' }}>
          {name}
        </Text>
        <br />
        <Text style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{description}</Text>
      </div>
      <Text code style={{ fontSize: 11 }}>
        {value || cssVar}
      </Text>
    </>
  );
}

export function TokensPage() {
  const { mode } = useThemeMode();

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={2}>Design Tokens</Title>
        <Paragraph type="secondary">
          Phase 54.1 acceptance artifact. Renders every semantic token in both themes. Edit
          values in <Text code>src/theme/tokens.ts</Text> and{' '}
          <Text code>src/theme/tokens.css</Text>; a parity test prevents drift. App-wide theme
          is currently <Text strong>{mode}</Text>.
        </Paragraph>
      </div>
      <Card bodyStyle={{ padding: 16 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: 16,
          }}
        >
          <ThemePreview mode="dark" />
          <ThemePreview mode="light" />
        </div>
      </Card>
    </Space>
  );
}

export default TokensPage;
