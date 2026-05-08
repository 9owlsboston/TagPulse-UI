import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Button, Form, Input, Card, Typography, Tabs, Alert } from 'antd';
import { KeyOutlined, IdcardOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

export function TenantGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loginWithApiKey, loginWithTenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Card style={{ width: 420 }}>
        <Title level={3}>TagPulse</Title>
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
