/**
 * Lot detail page (Sprint 21, updated Sprint 27 A1).
 *
 * Shows the lot's product, code, manufacture/expiry dates, and a
 * Cold-chain card built from the embedded `latest_telemetry` (when the
 * tenant has `lot` opted in for subject-scoped telemetry). The Telemetry
 * tab reuses `<SubjectTelemetryTab subjectKind="lot" />`.
 *
 * Sprint 27: Added Edit button + modal for admin/editor roles.
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, DatePicker, Descriptions, Form, Input, Modal, Space, Spin, Tabs, Tag, Typography, Statistic, Alert, message } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { useLot, useProduct } from '@/hooks/useInventory';
import { SubjectTelemetryTab } from '@/components/SubjectTelemetryTab';
import { useTenantConfig } from '@/hooks/useTenantConfig';
import { useCanPerform } from '@/components/useCanPerform';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { lotsApi } from '@/api/client';

const { Title, Text } = Typography;

const COLD_CHAIN_THRESHOLD_C = 8;

interface LotEditFormValues {
  lot_code: string;
  manufactured_at?: Dayjs | null;
  expires_at?: Dayjs | null;
  metadata_json?: string;
}

function ColdChainCard({ latest }: { latest: NonNullable<ReturnType<typeof useLot>['data']>['latest_telemetry'] }) {
  const temp = (latest ?? []).find((m) => m.metric_name === 'temperature_c');
  if (!temp) {
    return (
      <Card title="Cold-chain status" size="small">
        <Text type="secondary">No temperature readings yet for this lot.</Text>
      </Card>
    );
  }
  const breached = temp.metric_value > COLD_CHAIN_THRESHOLD_C;
  return (
    <Card
      title="Cold-chain status"
      size="small"
      extra={
        <Tag color={breached ? 'red' : 'green'}>
          {breached ? 'BREACH' : 'OK'}
        </Tag>
      }
    >
      <Space direction="vertical" size={8}>
        <Statistic
          title={`Latest temperature (threshold ${COLD_CHAIN_THRESHOLD_C} ${temp.unit ?? '°C'})`}
          value={temp.metric_value}
          precision={2}
          suffix={temp.unit ?? '°C'}
          valueStyle={{ color: breached ? '#cf1322' : '#3f8600' }}
        />
        <Text type="secondary">
          As of {new Date(temp.timestamp).toLocaleString()} · source: {temp.source}
        </Text>
        {breached && (
          <Alert
            type="error"
            showIcon
            message="Temperature above cold-chain threshold."
            description={`Configure a 'lot.cold_chain_breach' rule from the Rules → Templates gallery to alert on this condition automatically.`}
          />
        )}
      </Space>
    </Card>
  );
}

export function LotDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: lot, isLoading } = useLot(id);
  const { data: product } = useProduct(lot?.product_id ?? '');
  const { data: tenant } = useTenantConfig();
  const lotOptedIn = (tenant?.telemetry_subject_kinds ?? []).includes('lot');
  const canEdit = useCanPerform('editor');
  const [editOpen, setEditOpen] = useState(false);
  const [form] = Form.useForm<LotEditFormValues>();
  const qc = useQueryClient();

  const updateLot = useMutation({
    mutationFn: (data: Parameters<typeof lotsApi.update>[1]) => lotsApi.update(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', 'lot', id] });
      message.success('Lot updated');
      setEditOpen(false);
    },
    onError: (err: Error) => message.error(err.message),
  });

  const handleEdit = () => {
    if (!lot) return;
    form.setFieldsValue({
      lot_code: lot.lot_code,
      manufactured_at: lot.manufactured_at ? dayjs(lot.manufactured_at) : null,
      expires_at: lot.expires_at ? dayjs(lot.expires_at) : null,
      metadata_json: lot.metadata ? JSON.stringify(lot.metadata, null, 2) : '',
    });
    setEditOpen(true);
  };

  const handleSave = (values: LotEditFormValues) => {
    let metadata: Record<string, unknown> | null = null;
    if (values.metadata_json?.trim()) {
      try {
        metadata = JSON.parse(values.metadata_json);
      } catch {
        message.error('Invalid JSON in metadata');
        return;
      }
    }

    const data = {
      lot_code: values.lot_code,
      manufactured_at: values.manufactured_at ? values.manufactured_at.toISOString() : null,
      expires_at: values.expires_at ? values.expires_at.toISOString() : null,
      metadata,
    };

    // Warn about expires_at changes
    if (lot?.expires_at && values.expires_at?.toISOString() !== lot.expires_at) {
      Modal.confirm({
        title: 'Expiry date changed',
        content: 'Changing the expiry date may affect stock.expiring_within rules. Continue?',
        onOk: () => updateLot.mutate(data),
      });
    } else {
      updateLot.mutate(data);
    }
  };

  if (isLoading) return <Spin />;
  if (!lot || !id) return <Text type="secondary">Lot not found.</Text>;

  const tabItems = [
    {
      key: 'overview',
      label: 'Overview',
      children: (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Lot code">{lot.lot_code}</Descriptions.Item>
            <Descriptions.Item label="Product">
              {product ? (
                <a onClick={() => navigate(`/inventory/products/${lot.product_id}`)}>
                  {product.name}
                </a>
              ) : (
                lot.product_id
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Manufactured">
              {lot.manufactured_at ? new Date(lot.manufactured_at).toLocaleDateString() : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Expires">
              {lot.expires_at ? new Date(lot.expires_at).toLocaleDateString() : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {new Date(lot.created_at).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Metadata" span={2}>
              <pre style={{ margin: 0 }}>
                {lot.metadata ? JSON.stringify(lot.metadata, null, 2) : '—'}
              </pre>
            </Descriptions.Item>
          </Descriptions>

          {lotOptedIn ? (
            <ColdChainCard latest={lot.latest_telemetry} />
          ) : (
            <Alert
              type="info"
              showIcon
              message="Cold-chain monitoring is not enabled."
              description="Ask an admin to enable subject-scoped telemetry for `lot` in Tenant Settings."
            />
          )}
        </Space>
      ),
    },
    {
      key: 'telemetry',
      label: 'Telemetry',
      children: (
        <SubjectTelemetryTab
          subjectKind="lot"
          subjectId={id}
          latest={lot.latest_telemetry}
        />
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Title level={2} style={{ margin: 0 }}>Lot {lot.lot_code}</Title>
        {canEdit && (
          <Button icon={<EditOutlined />} onClick={handleEdit}>Edit</Button>
        )}
      </div>
      <Tabs items={tabItems} />

      <Modal
        title="Edit Lot"
        open={editOpen}
        onOk={() => form.submit()}
        onCancel={() => setEditOpen(false)}
        confirmLoading={updateLot.isPending}
        destroyOnClose
      >
        <Form<LotEditFormValues> form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="lot_code" label="Lot code" rules={[{ required: true, max: 64 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="manufactured_at" label="Manufactured at">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="expires_at" label="Expires at">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="metadata_json" label="Metadata (JSON)">
            <Input.TextArea rows={4} placeholder='{"key": "value"}' />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default LotDetail;
