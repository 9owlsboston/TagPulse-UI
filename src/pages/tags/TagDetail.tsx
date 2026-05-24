import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Alert from 'antd/es/alert';
import Button from 'antd/es/button';
import Card from 'antd/es/card';
import Descriptions from 'antd/es/descriptions';
import Modal from 'antd/es/modal';
import Select from 'antd/es/select';
import Space from 'antd/es/space';
import Spin from 'antd/es/spin';
import Tag from 'antd/es/tag';
import Typography from 'antd/es/typography';
import message from 'antd/es/message';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useTag, useUpdateTag } from '@/hooks/useTags';
import { useCanPerform } from '@/components/useCanPerform';
import { NewTransferModal } from '@/pages/transfers/NewTransferModal';
import type { TagResponse } from '@/api/generated/models/TagResponse';

const { Title, Text, Paragraph } = Typography;

const STATUS_COLOR: Record<string, string> = {
  registered: 'blue',
  active: 'green',
  retired: 'default',
  defective: 'orange',
  transferred_out: 'purple',
};

// Operator-mutable transitions only.
//
// The registrar worker owns `registered → active` and the transfer flow
// owns `* → transferred_out` (Sprint 50 Phase B `validate_status_transition`).
// We let the server reject the rest by returning the full enum here MINUS
// the system-owned edges — that way an operator who picks a forbidden
// transition gets a clear "409 not permitted" rather than the UI silently
// hiding the option (which would confuse runbook users).
const OPERATOR_STATUS_OPTIONS = [
  { value: 'retired', label: 'Retired' },
  { value: 'defective', label: 'Defective' },
];

export function TagDetail() {
  const { epcHex } = useParams<{ epcHex: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useTag(epcHex);
  const updateTag = useUpdateTag();
  const canEdit = useCanPerform('editor');
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | undefined>();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert
        type="error"
        message="Tag not found"
        description={`No tag with EPC ${epcHex} in this tenant's registry.`}
        action={<Button onClick={() => navigate('/tags')}>Back to tags</Button>}
      />
    );
  }

  const tag = data as TagResponse;
  const isTerminal =
    tag.status === 'retired' || tag.status === 'defective' || tag.status === 'transferred_out';

  const handleStatusChange = async () => {
    if (!pendingStatus) return;
    try {
      await updateTag.mutateAsync({ tagId: tag.id, body: { status: pendingStatus as TagResponse['status'] } });
      message.success(`Tag status updated to ${pendingStatus}.`);
      setStatusModalOpen(false);
      setPendingStatus(undefined);
    } catch (e) {
      const detail =
        e && typeof e === 'object' && 'body' in e
          ? JSON.stringify((e as { body: unknown }).body)
          : String(e);
      message.error(`Status change rejected: ${detail}`);
    }
  };

  return (
    <div data-testid="tag-detail-page">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/tags')}>
            Back
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            <Text code>{tag.epc_hex}</Text>
          {canEdit && tag.status === 'active' && (
            <Button
              type="primary"
              ghost
              onClick={() => setTransferModalOpen(true)}
              data-testid="tag-detail-transfer-btn"
            >
              Transfer
            </Button>
          )}
          </Title>
          <Tag color={STATUS_COLOR[tag.status] ?? 'default'}>{tag.status}</Tag>
          {canEdit && tag.status === 'active' && (
            <Button
              type="primary"
              ghost
              onClick={() => setTransferModalOpen(true)}
              data-testid="tag-detail-transfer-btn"
            >
              Transfer
            </Button>
          )}
        </Space>

        <Card title="Registry">
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="EPC (hex)">
              <Text code copyable>{tag.epc_hex}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={STATUS_COLOR[tag.status] ?? 'default'}>{tag.status}</Tag>
              {canEdit && !isTerminal && (
                <Button
                  size="small"
                  type="link"
                  onClick={() => {
                    setStatusModalOpen(true);
                    setPendingStatus(undefined);
                  }}
                >
                  Change status
                </Button>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Source">{tag.source}</Descriptions.Item>
            <Descriptions.Item label="GS1 URI">
              {tag.gs1_uri ? <Text code>{tag.gs1_uri}</Text> : <Text type="secondary">—</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="First seen">{tag.first_seen_at ?? 'Never'}</Descriptions.Item>
            <Descriptions.Item label="Last seen">{tag.last_seen_at ?? 'Never'}</Descriptions.Item>
            <Descriptions.Item label="Created">{tag.created_at}</Descriptions.Item>
            <Descriptions.Item label="Updated">{tag.updated_at}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Metadata" size="small">
          {tag.metadata_ && Object.keys(tag.metadata_).length > 0 ? (
            <pre style={{ margin: 0, fontSize: 12 }}>{JSON.stringify(tag.metadata_, null, 2)}</pre>
          ) : (
            <Text type="secondary">No metadata.</Text>
          )}
        </Card>

        <Card title="Labels" size="small">
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Labels are managed under{' '}
            <a onClick={() => navigate('/admin/labels')}>Admin → Labels</a>. Reserved keys
            (<Text code>batch</Text>, <Text code>batch.color</Text>, <Text code>batch.lot</Text>,{' '}
            <Text code>batch.printer</Text>) are managed at the catalog level per ADR 028.
          </Paragraph>
        </Card>
      </Space>

      <Modal
        title={`Change status — ${tag.epc_hex}`}
        open={statusModalOpen}
        onCancel={() => setStatusModalOpen(false)}
        onOk={handleStatusChange}
        okButtonProps={{ disabled: !pendingStatus, loading: updateTag.isPending }}
        okText="Apply change"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message="Status transitions are server-validated."
            description={
              <>
                The registrar worker owns the <Text code>registered → active</Text> edge and the
                transfer flow owns <Text code>* → transferred_out</Text>. Picking a forbidden
                transition will return a 409 with the allowed set.
              </>
            }
          />
          <Select
            aria-label="New status"
            value={pendingStatus}
            placeholder="Select a new status"
            style={{ width: '100%' }}
            options={OPERATOR_STATUS_OPTIONS}
            onChange={setPendingStatus}
          />
        </Space>
      </Modal>

      <NewTransferModal
        open={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        prefillEpcs={[tag.epc_hex]}
      />
    </div>
  );
}
