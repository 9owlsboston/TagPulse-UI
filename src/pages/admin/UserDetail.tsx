import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from 'antd/es/button';
import Card from 'antd/es/card';
import Descriptions from 'antd/es/descriptions';
import Tag from 'antd/es/tag';
import Select from 'antd/es/select';
import Input from 'antd/es/input';
import Space from 'antd/es/space';
import Typography from 'antd/es/typography';
import App from 'antd/es/app';
import Spin from 'antd/es/spin';
import Alert from 'antd/es/alert';
import { KeyOutlined, DeleteOutlined } from '@ant-design/icons';
import { useUsers, useUpdateUser, useGenerateApiKey, useRevokeApiKey } from '@/hooks/useUsers';

const { Title, Text, Paragraph } = Typography;

const ROLE_OPTIONS = [
  { label: 'Viewer', value: 'viewer' },
  { label: 'Editor', value: 'editor' },
  { label: 'Admin', value: 'admin' },
];

function relativeTime(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { modal, message } = App.useApp();
  const { data: users, isLoading } = useUsers();
  const updateUser = useUpdateUser();
  const generateApiKey = useGenerateApiKey();
  const revokeApiKey = useRevokeApiKey();

  const [editName, setEditName] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<string | null>(null);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  const user = users?.find((u) => u.id === id);

  if (isLoading) return <Spin size="large" />;
  if (!user) return <Alert type="error" message="User not found" />;

  const handleSave = async () => {
    const data: Record<string, string> = {};
    if (editName !== null && editName !== user.name) data.name = editName;
    if (editRole !== null && editRole !== user.role) data.role = editRole;
    if (Object.keys(data).length === 0) return;
    await updateUser.mutateAsync({ id: user.id, data });
    setEditName(null);
    setEditRole(null);
    message.success('User updated');
  };

  const handleToggleStatus = () => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    modal.confirm({
      title: `${newStatus === 'inactive' ? 'Deactivate' : 'Reactivate'} User`,
      content: `Are you sure you want to ${newStatus === 'inactive' ? 'deactivate' : 'reactivate'} ${user.name}?`,
      okType: newStatus === 'inactive' ? 'danger' : 'primary',
      onOk: async () => {
        await updateUser.mutateAsync({ id: user.id, data: { status: newStatus } });
        message.success(`User ${newStatus === 'inactive' ? 'deactivated' : 'reactivated'}`);
      },
    });
  };

  const handleGenerateKey = async () => {
    const result = await generateApiKey.mutateAsync(user.id);
    setGeneratedKey(result.api_key);
  };

  const handleRevokeKey = () => {
    modal.confirm({
      title: 'Revoke API Key',
      content: 'This will immediately invalidate the key. The user will need a new key to authenticate.',
      okType: 'danger',
      onOk: async () => {
        await revokeApiKey.mutateAsync(user.id);
        message.success('API key revoked');
      },
    });
  };

  const isEditing = editName !== null || editRole !== null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>{user.name}</Title>
        <Space>
          <Button onClick={() => navigate('/admin/users')}>Back to Users</Button>
          <Button
            danger={user.status === 'active'}
            onClick={handleToggleStatus}
          >
            {user.status === 'active' ? 'Deactivate' : 'Reactivate'}
          </Button>
        </Space>
      </div>

      <Card title="User Info" style={{ marginBottom: 16 }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={user.status === 'active' ? 'green' : 'default'}>{user.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Name">
            <Input
              value={editName ?? user.name}
              onChange={(e) => setEditName(e.target.value)}
              style={{ width: 250 }}
            />
          </Descriptions.Item>
          <Descriptions.Item label="Role">
            <Select
              value={editRole ?? user.role}
              onChange={(v) => setEditRole(v)}
              options={ROLE_OPTIONS}
              style={{ width: 150 }}
            />
          </Descriptions.Item>
          <Descriptions.Item label="Created">{new Date(user.created_at).toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="Last Login">{user.last_login ? new Date(user.last_login).toLocaleString() : '—'}</Descriptions.Item>
        </Descriptions>
        {isEditing && (
          <div style={{ marginTop: 16 }}>
            <Button type="primary" onClick={handleSave} loading={updateUser.isPending} style={{ marginRight: 8 }}>
              Save Changes
            </Button>
            <Button onClick={() => { setEditName(null); setEditRole(null); }}>Cancel</Button>
          </div>
        )}
      </Card>

      <Card title="API Key">
        {generatedKey ? (
          <Alert
            type="success"
            showIcon
            message="API Key Generated"
            description={
              <div>
                <Paragraph copyable={{ text: generatedKey }} style={{ marginBottom: 0 }}>
                  <code>{generatedKey}</code>
                </Paragraph>
                <Text type="secondary">Store this key securely — it cannot be retrieved again.</Text>
              </div>
            }
            closable
            onClose={() => setGeneratedKey(null)}
            style={{ marginBottom: 16 }}
          />
        ) : null}
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>Current key: </Text>
            {user.api_key_prefix ? (
              <Space>
                <Tag icon={<KeyOutlined />}>{user.api_key_prefix}...</Tag>
                {user.api_key_created_at ? (
                  <Text type="secondary">
                    Key issued {relativeTime(user.api_key_created_at)}
                  </Text>
                ) : null}
              </Space>
            ) : (
              <Text type="secondary">No key generated</Text>
            )}
          </div>
          <Space>
            <Button
              type="primary"
              icon={<KeyOutlined />}
              onClick={handleGenerateKey}
              loading={generateApiKey.isPending}
            >
              {user.api_key_prefix ? 'Regenerate API Key' : 'Generate API Key'}
            </Button>
            {user.api_key_prefix && (
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleRevokeKey}
                loading={revokeApiKey.isPending}
              >
                Revoke Key
              </Button>
            )}
          </Space>
        </Space>
      </Card>
    </div>
  );
}
