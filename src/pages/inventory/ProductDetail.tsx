import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Col, DatePicker, Descriptions, Form, Input, Modal, Row, Space, Table, Tag, Typography, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import dayjs, { type Dayjs } from 'dayjs';
import { useCreateLot, useLots, useProduct, useStockLevels } from '@/hooks/useInventory';
import { useCanPerform } from '@/components/useCanPerform';
import type { LotResponse } from '@/api/generated/models/LotResponse';

const { Title } = Typography;

interface LotFormValues {
  lot_code: string;
  manufactured_at?: Dayjs | null;
  expires_at?: Dayjs | null;
}

export function ProductDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading } = useProduct(id);
  const { data: lots, isLoading: lotsLoading } = useLots(id);
  const { data: levels } = useStockLevels({ product_id: id });
  const createLot = useCreateLot();
  const canEdit = useCanPerform('editor');

  const [lotModalOpen, setLotModalOpen] = useState(false);
  const [form] = Form.useForm<LotFormValues>();

  const chartData = useMemo(
    () =>
      (levels ?? []).map((row) => ({
        zone: row.zone_id ? row.zone_id.slice(0, 8) : 'unassigned',
        quantity: row.quantity,
      })),
    [levels],
  );

  const totalOnHand = useMemo(
    () => (levels ?? []).reduce((sum, r) => sum + r.quantity, 0),
    [levels],
  );

  const onCreateLot = async (values: LotFormValues) => {
    try {
      await createLot.mutateAsync({
        productId: id,
        data: {
          lot_code: values.lot_code,
          manufactured_at: values.manufactured_at ? values.manufactured_at.toISOString() : null,
          expires_at: values.expires_at ? values.expires_at.toISOString() : null,
        },
      });
      message.success(`Lot ${values.lot_code} created`);
      setLotModalOpen(false);
      form.resetFields();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to create lot');
    }
  };

  if (isLoading || !product) return <div>Loading…</div>;

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button onClick={() => navigate('/inventory/products')}>← Products</Button>
      </Space>
      <Title level={2}>{product.sku} — {product.name}</Title>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="Details" size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="SKU">{product.sku}</Descriptions.Item>
              <Descriptions.Item label="GTIN">{product.gtin ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Category">{product.category ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Unit"><Tag>{product.unit}</Tag></Descriptions.Item>
              <Descriptions.Item label="Total on hand"><b>{totalOnHand}</b></Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Stock by zone" size="small">
            {chartData.length === 0 ? (
              <div style={{ color: '#999' }}>No stock items recorded yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="zone" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#1677ff" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>

      <Card
        title="Lots"
        style={{ marginTop: 16 }}
        extra={
          canEdit ? (
            <Button icon={<PlusOutlined />} onClick={() => setLotModalOpen(true)}>
              New Lot
            </Button>
          ) : null
        }
      >
        <Table<LotResponse>
          rowKey="id"
          loading={lotsLoading}
          dataSource={lots ?? []}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: 'Lot code', dataIndex: 'lot_code', sorter: (a, b) => a.lot_code.localeCompare(b.lot_code) },
            {
              title: 'Manufactured',
              dataIndex: 'manufactured_at',
              render: (v: string | null) => (v ? dayjs(v).format('YYYY-MM-DD') : '—'),
            },
            {
              title: 'Expires',
              dataIndex: 'expires_at',
              render: (v: string | null) => {
                if (!v) return '—';
                const d = dayjs(v);
                const days = d.diff(dayjs(), 'day');
                const colour = days < 0 ? 'red' : days < 7 ? 'orange' : 'default';
                return <Tag color={colour}>{d.format('YYYY-MM-DD')}</Tag>;
              },
            },
          ]}
        />
      </Card>

      <Modal
        title="Create Lot"
        open={lotModalOpen}
        onOk={() => form.submit()}
        onCancel={() => setLotModalOpen(false)}
        confirmLoading={createLot.isPending}
        destroyOnClose
      >
        <Form<LotFormValues> form={form} layout="vertical" onFinish={onCreateLot}>
          <Form.Item name="lot_code" label="Lot code" rules={[{ required: true, max: 64 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="manufactured_at" label="Manufactured at">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="expires_at" label="Expires at">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
