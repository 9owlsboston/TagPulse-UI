import { Button, Form, Input, Select, Typography, Card, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useCreateUser } from '@/hooks/useUsers';
import type { UserCreate } from '@/types';

const { Title } = Typography;

const ROLE_OPTIONS = [
  { label: 'Viewer', value: 'viewer' },
  { label: 'Editor', value: 'editor' },
  { label: 'Admin', value: 'admin' },
];

export function UserCreate() {
  const navigate = useNavigate();
  const createUser = useCreateUser();

  const handleSubmit = async (values: UserCreate) => {
    await createUser.mutateAsync(values);
    message.success('User created');
    navigate('/admin/users');
  };

  return (
    <div>
      <Title level={2}>Create User</Title>
      <Card style={{ maxWidth: 500 }}>
        <Form<UserCreate> layout="vertical" onFinish={handleSubmit} initialValues={{ role: 'viewer' }}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Valid email is required' }]}>
            <Input placeholder="user@example.com" />
          </Form.Item>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input placeholder="Full Name" />
          </Form.Item>
          <Form.Item name="role" label="Role" rules={[{ required: true }]}>
            <Select options={ROLE_OPTIONS} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={createUser.isPending} style={{ marginRight: 8 }}>
              Create
            </Button>
            <Button onClick={() => navigate('/admin/users')}>Cancel</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
