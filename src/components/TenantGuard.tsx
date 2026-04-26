import { useAuth } from '@/lib/auth';
import { Button, Form, Input, Card, Typography } from 'antd';

const { Title, Text } = Typography;

export function TenantGuard({ children }: { children: React.ReactNode }) {
  const { tenantId, setTenantId } = useAuth();

  if (!tenantId) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Card style={{ width: 400 }}>
          <Title level={3}>TagPulse</Title>
          <Text type="secondary">Enter your tenant ID to continue</Text>
          <Form<{ tenantId: string }>
            style={{ marginTop: 24 }}
            onFinish={(values) => setTenantId(values.tenantId)}
          >
            <Form.Item name="tenantId" rules={[{ required: true, message: 'Tenant ID is required' }]}>
              <Input placeholder="Tenant ID" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block>
                Continue
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
