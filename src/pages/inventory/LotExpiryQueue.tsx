/**
 * Lot Expiry Queue (Sprint 15b Phase F).
 *
 * Cross-product list of lots ordered by soonest expiry. Default filter is
 * 7 days; the user can broaden the window or include un-expiring lots.
 */
import { useMemo, useState } from 'react';
import { Card, Table, Tag, Select, Space, Typography } from 'antd';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAllLots, useProducts } from '@/hooks/useInventory';
import type { LotResponse } from '@/api/generated/models/LotResponse';

const WINDOWS = [
  { value: 1, label: 'Next 24h' },
  { value: 7, label: 'Next 7 days' },
  { value: 30, label: 'Next 30 days' },
  { value: 90, label: 'Next 90 days' },
  { value: 0, label: 'All lots (incl. no expiry)' },
];

function expiryTag(expires_at: string | null | undefined) {
  if (!expires_at) return <Tag>no expiry</Tag>;
  const exp = dayjs(expires_at);
  const now = dayjs();
  const days = exp.diff(now, 'day');
  if (exp.isBefore(now)) return <Tag color="red">expired</Tag>;
  if (days < 7) return <Tag color="orange">{days}d</Tag>;
  if (days < 30) return <Tag color="gold">{days}d</Tag>;
  return <Tag color="green">{days}d</Tag>;
}

export default function LotExpiryQueue() {
  const [windowDays, setWindowDays] = useState<number>(7);
  const { data: lots, isLoading } = useAllLots({
    expiringWithinDays: windowDays === 0 ? undefined : windowDays,
    limit: 500,
  });
  const { data: products } = useProducts({ limit: 500 });
  const productName = useMemo(() => {
    const m = new Map<string, string>();
    (products ?? []).forEach((p) => m.set(p.id, p.name));
    return m;
  }, [products]);

  return (
    <Card
      title="Lot Expiry Queue"
      extra={
        <Space>
          <Typography.Text>Window:</Typography.Text>
          <Select
            value={windowDays}
            onChange={setWindowDays}
            options={WINDOWS}
            style={{ width: 220 }}
          />
        </Space>
      }
    >
      <Table<LotResponse>
        rowKey="id"
        loading={isLoading}
        dataSource={lots ?? []}
        size="small"
        pagination={{ pageSize: 50 }}
        columns={[
          {
            title: 'Lot code',
            dataIndex: 'lot_code',
            sorter: (a, b) => a.lot_code.localeCompare(b.lot_code),
            render: (v: string, row: LotResponse) => (
              <Link to={`/inventory/lots/${row.id}`}>{v}</Link>
            ),
          },
          {
            title: 'Product',
            dataIndex: 'product_id',
            render: (pid: string) => (
              <Link to={`/inventory/products/${pid}`}>
                {productName.get(pid) ?? pid.slice(0, 8)}
              </Link>
            ),
          },
          {
            title: 'Expires',
            dataIndex: 'expires_at',
            defaultSortOrder: 'ascend',
            sorter: (a, b) => {
              const av = a.expires_at ? dayjs(a.expires_at).valueOf() : Infinity;
              const bv = b.expires_at ? dayjs(b.expires_at).valueOf() : Infinity;
              return av - bv;
            },
            render: (v: string | null) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—'),
          },
          {
            title: 'Status',
            key: 'status',
            render: (_, r) => expiryTag(r.expires_at),
          },
          {
            title: 'Notes',
            dataIndex: 'notes',
            ellipsis: true,
          },
        ]}
      />
    </Card>
  );
}
