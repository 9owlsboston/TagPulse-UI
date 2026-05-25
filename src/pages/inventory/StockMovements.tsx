import { useMemo, useState } from 'react';
import Card from 'antd/es/card';
import DatePicker from 'antd/es/date-picker';
import Select from 'antd/es/select';
import Space from 'antd/es/space';
import Table from 'antd/es/table';
import Tag from 'antd/es/tag';
import Typography from 'antd/es/typography';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useProducts, useStockMovements } from '@/hooks/useInventory';
import { SitesZonesService } from '@/api/generated/services/SitesZonesService';
import { useQuery } from '@tanstack/react-query';
import type { StockMovementResponse } from '@/api/generated/models/StockMovementResponse';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const TYPE_COLOUR: Record<string, string> = {
  enter: 'green',
  exit: 'red',
  transfer: 'blue',
  consume: 'purple',
};

export function StockMovements() {
  const [productId, setProductId] = useState<string | undefined>();
  const [zoneId, setZoneId] = useState<string | undefined>();
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(null);

  const { data: products } = useProducts({ limit: 500 });
  const { data: zones } = useQuery({
    queryKey: ['zones'],
    queryFn: () => SitesZonesService.listZonesZonesGet(),
  });

  const { data: movements, isLoading } = useStockMovements({
    product_id: productId,
    zone_id: zoneId,
    since: range?.[0]?.toISOString(),
    until: range?.[1]?.toISOString(),
    limit: 500,
  });

  const zoneLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const z of zones ?? []) m.set(z.id, z.name);
    return m;
  }, [zones]);

  const productLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products ?? []) m.set(p.id, p.sku);
    return m;
  }, [products]);

  const productOptions = (products ?? []).map((p) => ({ value: p.id, label: `${p.sku} — ${p.name}` }));
  const zoneOptions = (zones ?? []).map((z) => ({ value: z.id, label: z.name }));

  return (
    <div>
      <Title level={2}>Stock Movements</Title>
      <Card>
        <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          <Select
            allowClear
            showSearch
            placeholder="Filter by product"
            style={{ width: 280 }}
            options={productOptions}
            value={productId}
            onChange={setProductId}
            filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          />
          <Select
            allowClear
            showSearch
            placeholder="Filter by zone"
            style={{ width: 220 }}
            options={zoneOptions}
            value={zoneId}
            onChange={setZoneId}
            filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          />
          <RangePicker showTime onChange={(v) => setRange(v as [Dayjs, Dayjs] | null)} />
        </Space>
        <Table<StockMovementResponse>
          rowKey="id"
          loading={isLoading}
          dataSource={movements ?? []}
          pagination={{ pageSize: 25, showSizeChanger: false }}
          columns={[
            {
              title: 'When',
              dataIndex: 'occurred_at',
              defaultSortOrder: 'descend',
              sorter: (a, b) => dayjs(a.occurred_at).valueOf() - dayjs(b.occurred_at).valueOf(),
              render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm:ss'),
              width: 180,
            },
            {
              title: 'Type',
              dataIndex: 'movement_type',
              width: 110,
              render: (t: string) => <Tag color={TYPE_COLOUR[t] ?? 'default'}>{t}</Tag>,
            },
            {
              title: 'Stock item',
              dataIndex: 'stock_item_id',
              render: (v: string) => <code>{v.slice(0, 8)}</code>,
            },
            {
              title: 'From',
              dataIndex: 'from_zone_id',
              render: (v: string | null) => (v ? (zoneLabel.get(v) ?? v.slice(0, 8)) : '—'),
            },
            {
              title: 'To',
              dataIndex: 'to_zone_id',
              render: (v: string | null) => (v ? (zoneLabel.get(v) ?? v.slice(0, 8)) : '—'),
            },
            { title: 'Qty', dataIndex: 'quantity', width: 80, align: 'right' },
            {
              title: 'Device',
              dataIndex: 'device_id',
              render: (v: string | null) => (v ? <code>{v.slice(0, 8)}</code> : '—'),
            },
          ]}
          summary={() =>
            productId || zoneId || range ? (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={7}>
                  <span style={{ color: 'var(--color-text-muted)' }}>
                    Filters active{productId ? ` · product=${productLabel.get(productId)}` : ''}
                    {zoneId ? ` · zone=${zoneLabel.get(zoneId)}` : ''}
                    {range ? ` · ${range[0].format('YYYY-MM-DD HH:mm')} → ${range[1].format('YYYY-MM-DD HH:mm')}` : ''}
                  </span>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            ) : null
          }
        />
      </Card>
    </div>
  );
}
