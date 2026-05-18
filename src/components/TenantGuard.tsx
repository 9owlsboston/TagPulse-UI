import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import Button from 'antd/es/button';
import Form from 'antd/es/form';
import Input from 'antd/es/input';
import Card from 'antd/es/card';
import Typography from 'antd/es/typography';
import Tabs from 'antd/es/tabs';
import Alert from 'antd/es/alert';
import { KeyOutlined, IdcardOutlined } from '@ant-design/icons';
import { usePublicBranding } from '@/hooks/useTenantBranding';
import { useThemeMode } from '@/theme/ThemeProvider';

const { Title, Text } = Typography;

export function TenantGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loginWithApiKey, loginWithTenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sprint 33 QW6 — when the login URL carries `?tenant=<slug>`, fetch
  // public branding and re-skin the login card (logo, display name, brand
  // colour). The brand colour is pushed into ThemeProvider so AntD's
  // primary buttons match. `slug` is read once on mount; URL changes
  // after navigation don't matter (login is the entry point).
  const slug = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('tenant');
  }, []);
  const { data: publicBranding } = usePublicBranding(slug);
  const { setBrandColor } = useThemeMode();
  useEffect(() => {
    if (!publicBranding) return;
    setBrandColor(publicBranding.brand_color ?? null);
  }, [publicBranding, setBrandColor]);

  if (isAuthenticated) {
    return <>{children}</>;
  }

  const handleApiKeyLogin = async (values: { email: string; apiKey: string }) => {
    setLoading(true);
    setError(null);
    try {
      await loginWithApiKey(values.email, values.apiKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTenantIdLogin = async (values: { tenantId: string }) => {
    setLoading(true);
    setError(null);
    try {
      await loginWithTenantId(values.tenantId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const heading =
    publicBranding?.display_name?.trim() || publicBranding?.name || 'TagPulse';
  const logoUrl = publicBranding?.logo_url?.trim();

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Card style={{ width: 420 }} data-testid="login-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          {logoUrl && (
            <img
              src={logoUrl}
              alt=""
              style={{ height: 36, maxWidth: 80, objectFit: 'contain' }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <Title level={3} style={{ margin: 0 }}>
            {heading}
          </Title>
        </div>
        {publicBranding?.name && publicBranding.display_name && (
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
            {publicBranding.name}
          </Text>
        )}
        {error && <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} style={{ marginBottom: 16 }} />}
        <Tabs
          defaultActiveKey="apikey"
          items={[
            {
              key: 'apikey',
              label: <span><KeyOutlined /> API Key</span>,
              children: (
                <>
                  <Text type="secondary">Sign in with your email and API key</Text>
                  <Form<{ email: string; apiKey: string }>
                    style={{ marginTop: 16 }}
                    onFinish={handleApiKeyLogin}
                    layout="vertical"
                  >
                    <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Email is required' }]}>
                      <Input placeholder="admin@example.com" />
                    </Form.Item>
                    <Form.Item name="apiKey" label="API Key" rules={[{ required: true, message: 'API key is required' }]}>
                      <Input.Password placeholder="tp_..." />
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary" htmlType="submit" block loading={loading}>
                        Sign In
                      </Button>
                    </Form.Item>
                  </Form>
                </>
              ),
            },
            {
              key: 'tenant',
              label: <span><IdcardOutlined /> Tenant ID</span>,
              children: (
                <>
                  <Text type="secondary">Read-only access with tenant ID</Text>
                  <Form<{ tenantId: string }>
                    style={{ marginTop: 16 }}
                    onFinish={handleTenantIdLogin}
                    layout="vertical"
                  >
                    <Form.Item name="tenantId" label="Tenant ID" rules={[{ required: true, message: 'Tenant ID is required' }]}>
                      <Input placeholder="11111111-1111-1111-1111-111111111111" />
                    </Form.Item>
                    <Form.Item>
                      <Button type="default" htmlType="submit" block loading={loading}>
                        Continue as Viewer
                      </Button>
                    </Form.Item>
                  </Form>
                </>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
