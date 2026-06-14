import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from 'antd/es/button';
import Card from 'antd/es/card';
import Col from 'antd/es/col';
import DatePicker from 'antd/es/date-picker';
import Descriptions from 'antd/es/descriptions';
import Drawer from 'antd/es/drawer';
import Form from 'antd/es/form';
import Input from 'antd/es/input';
import Modal from 'antd/es/modal';
import Row from 'antd/es/row';
import Select from 'antd/es/select';
import Space from 'antd/es/space';
import Table from 'antd/es/table';
import Tag from 'antd/es/tag';
import Typography from 'antd/es/typography';
import message from 'antd/es/message';
import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import dayjs, { type Dayjs } from 'dayjs';
import {
  useCreateLot,
  useLots,
  useProduct,
  useStockItems,
  useStockLevels,
  useStockMovements,
  useUpdateProduct,
} from '@/hooks/useInventory';
import { useZones } from '@/hooks/useAssets';
import { useCanPerform } from '@/components/useCanPerform';
import { useThemeMode } from '@/theme/ThemeProvider';
import { tokens } from '@/theme/tokens';
import type { LotResponse } from '@/api/generated/models/LotResponse';
import type { StockItemResponse } from '@/api/generated/models/StockItemResponse';
import type { StockMovementResponse } from '@/api/generated/models/StockMovementResponse';

const { Title } = Typography;

interface LotFormValues {
  lot_code: string;
  manufactured_at?: Dayjs | null;
  expires_at?: Dayjs | null;
}

interface ProductEditFormValues {
  name: string;
  sku: string;
  gtin?: string;
  category?: string;
  unit: string;
  attributes_json?: string;
}

export function ProductDetail() {
  const { mode } = useThemeMode();
  const t = tokens[mode];
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading } = useProduct(id);
  const { data: lots, isLoading: lotsLoading } = useLots(id);
  const { data: levels } = useStockLevels({ product_id: id });
  const createLot = useCreateLot();
  const updateProduct = useUpdateProduct();
  const canEdit = useCanPerform('editor');
  const isAdmin = useCanPerform('admin');

  const [lotModalOpen, setLotModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [form] = Form.useForm<LotFormValues>();
  const [editForm] = Form.useForm<ProductEditFormValues>();

  // §59.8 Units table state: zone + state facet filters and the per-unit
  // movement-history drawer.
  const [unitState, setUnitState] = useState<string | undefined>();
  const [unitZoneId, setUnitZoneId] = useState<string | undefined>();
  const [historyUnit, setHistoryUnit] = useState<StockItemResponse | null>(null);

  const { data: units, isLoading: unitsLoading } = useStockItems({
    product_id: id,
    state: unitState,
    zone_id: unitZoneId,
  });
  const { data: zones } = useZones();
  const { data: unitMovements, isLoading: movementsLoading } = useStockMovements(
    { stock_item_id: historyUnit?.id },
  );

  const zoneName = useMemo(() => {
    const map = new Map<string, string>();
    for (const z of zones ?? []) map.set(z.id, z.name);
    return (zoneId: string | null | undefined) =>
      zoneId ? (map.get(zoneId) ?? zoneId.slice(0, 8)) : 'unassigned';
  }, [zones]);

  // Facet options derived from the data actually present, so the filters never
  // offer an empty slice.
  const unitStateOptions = useMemo(() => {
    const states = new Set((units ?? []).map((u) => u.state));
    return [...states].sort().map((s) => ({ label: s, value: s }));
  }, [units]);
  const unitZoneOptions = useMemo(() => {
    const ids = new Set((units ?? []).map((u) => u.current_zone_id).filter(Boolean) as string[]);
    return [...ids].map((zid) => ({ label: zoneName(zid), value: zid }));
  }, [units, zoneName]);

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

  const handleEditProduct = () => {
    if (!product) return;
    editForm.setFieldsValue({
      name: product.name,
      sku: product.sku,
      gtin: product.gtin ?? '',
      category: product.category ?? '',
      unit: product.unit,
      attributes_json: product.attributes ? JSON.stringify(product.attributes, null, 2) : '',
    });
    setEditModalOpen(true);
  };

  const onSaveProduct = async (values: ProductEditFormValues) => {
    let attributes: Record<string, unknown> | null = null;
    if (values.attributes_json?.trim()) {
      try {
        attributes = JSON.parse(values.attributes_json);
      } catch {
        message.error('Invalid JSON in attributes');
        return;
      }
    }
    try {
      await updateProduct.mutateAsync({
        id,
        data: {
          name: values.name,
          sku: values.sku,
          gtin: values.gtin || null,
          category: values.category || null,
          unit: values.unit as 'each' | 'case' | 'pallet',
          attributes,
        },
      });
      message.success('Product updated');
      setEditModalOpen(false);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to update product');
    }
  };

  if (isLoading || !product) return <div>Loading…</div>;

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Button onClick={() => navigate('/inventory/products')}>← Products</Button>
        {isAdmin && (
          <Button icon={<EditOutlined />} onClick={handleEditProduct}>Edit</Button>
        )}
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
              <div style={{ color: 'var(--color-text-muted)' }}>No stock items recorded yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="zone" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="quantity" fill={t.colorAccent} />
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

      {/* §59.8 Units table — individual stock-item units, name-resolved zone,
          zone + state facet filters, and a per-unit movement-history drawer. */}
      <Card
        title="Units"
        style={{ marginTop: 16 }}
        extra={
          <Space wrap>
            <Select
              allowClear
              placeholder="State"
              style={{ width: 150 }}
              value={unitState}
              onChange={(v) => setUnitState(v)}
              options={unitStateOptions}
              data-testid="units-state-filter"
            />
            <Select
              allowClear
              placeholder="Zone"
              style={{ width: 180 }}
              value={unitZoneId}
              onChange={(v) => setUnitZoneId(v)}
              options={unitZoneOptions}
              data-testid="units-zone-filter"
            />
          </Space>
        }
      >
        <Table<StockItemResponse>
          rowKey="id"
          loading={unitsLoading}
          dataSource={units ?? []}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'No units recorded for this product yet.' }}
          onRow={(row) => ({
            onClick: () => setHistoryUnit(row),
            style: { cursor: 'pointer' },
          })}
          columns={[
            {
              title: 'EPC / binding',
              dataIndex: 'binding_value',
              render: (v: string, row) => (
                <Space size={4}>
                  <Tag>{row.binding_kind}</Tag>
                  <span style={{ fontFamily: 'monospace' }}>{v}</span>
                </Space>
              ),
            },
            {
              title: 'State',
              dataIndex: 'state',
              render: (v: string) => (
                <Tag color={v === 'in_stock' ? 'green' : v === 'consumed' ? 'default' : 'blue'}>{v}</Tag>
              ),
            },
            {
              title: 'Zone',
              dataIndex: 'current_zone_id',
              render: (v: string | null) => zoneName(v),
            },
            {
              title: 'Last seen',
              dataIndex: 'last_seen_at',
              sorter: (a, b) => new Date(a.last_seen_at).getTime() - new Date(b.last_seen_at).getTime(),
              defaultSortOrder: 'descend',
              render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
            },
          ]}
        />
      </Card>

      <Drawer
        title={historyUnit ? `Unit history — ${historyUnit.binding_value}` : 'Unit history'}
        open={historyUnit !== null}
        onClose={() => setHistoryUnit(null)}
        width={520}
        data-testid="unit-history-drawer"
      >
        <Table<StockMovementResponse>
          rowKey="id"
          loading={movementsLoading}
          dataSource={unitMovements ?? []}
          pagination={{ pageSize: 20 }}
          locale={{ emptyText: 'No movements recorded for this unit.' }}
          columns={[
            {
              title: 'When',
              dataIndex: 'occurred_at',
              render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
            },
            { title: 'Type', dataIndex: 'movement_type', render: (v: string) => <Tag>{v}</Tag> },
            { title: 'From', dataIndex: 'from_zone_id', render: (v: string | null) => zoneName(v) },
            { title: 'To', dataIndex: 'to_zone_id', render: (v: string | null) => zoneName(v) },
          ]}
        />
      </Drawer>

      <Modal
        title="Create Lot"
        open={lotModalOpen}
        onOk={() => form.submit()}
        onCancel={() => setLotModalOpen(false)}
        confirmLoading={createLot.isPending}
        destroyOnHidden
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

      <Modal
        title="Edit Product"
        open={editModalOpen}
        onOk={() => editForm.submit()}
        onCancel={() => setEditModalOpen(false)}
        confirmLoading={updateProduct.isPending}
        destroyOnHidden
      >
        <Form<ProductEditFormValues> form={editForm} layout="vertical" onFinish={onSaveProduct}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="sku" label="SKU" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="gtin" label="GTIN">
            <Input />
          </Form.Item>
          <Form.Item name="category" label="Category">
            <Input />
          </Form.Item>
          <Form.Item name="unit" label="Unit" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="attributes_json" label="Attributes (JSON)">
            <Input.TextArea rows={4} placeholder='{"key": "value"}' />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
