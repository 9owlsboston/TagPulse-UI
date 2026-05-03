import { useMemo } from 'react';
import { Button, Card, Empty, Space, Table, Typography } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useStockLevels } from '@/hooks/useInventory';
import { useProducts } from '@/hooks/useInventory';
import { SitesZonesService } from '@/api/generated/services/SitesZonesService';
import { useQuery } from '@tanstack/react-query';

const { Title } = Typography;

const UNASSIGNED = '__unassigned__';

interface PivotRow {
  key: string;
  product: string;
  total: number;
  perZone: Record<string, number>;
}

function toCsv(rows: PivotRow[], zones: { key: string; label: string }[]): string {
  const header = ['SKU/Product', ...zones.map((z) => z.label), 'Total'];
  const lines = [header.map(escape).join(',')];
  for (const r of rows) {
    const cells: string[] = [r.product];
    for (const z of zones) cells.push(String(r.perZone[z.key] ?? 0));
    cells.push(String(r.total));
    lines.push(cells.map(escape).join(','));
  }
  return lines.join('\n');
}

function escape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadCsv(filename: string, body: string): void {
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function StockLevels() {
  const { data: levels, isLoading } = useStockLevels();
  const { data: products } = useProducts({ limit: 500 });
  const { data: zones } = useQuery({
    queryKey: ['zones'],
    queryFn: () => SitesZonesService.listZonesZonesGet(),
  });

  const productLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products ?? []) map.set(p.id, `${p.sku} — ${p.name}`);
    return map;
  }, [products]);

  const zoneLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const z of zones ?? []) map.set(z.id, z.name);
    return map;
  }, [zones]);

  const { rows, zoneCols } = useMemo(() => {
    const byProduct = new Map<string, PivotRow>();
    const usedZones = new Set<string>();
    for (const lvl of levels ?? []) {
      const zoneKey = lvl.zone_id ?? UNASSIGNED;
      usedZones.add(zoneKey);
      const existing = byProduct.get(lvl.product_id) ?? {
        key: lvl.product_id,
        product: productLabel.get(lvl.product_id) ?? lvl.product_id.slice(0, 8),
        total: 0,
        perZone: {},
      };
      existing.perZone[zoneKey] = (existing.perZone[zoneKey] ?? 0) + lvl.quantity;
      existing.total += lvl.quantity;
      byProduct.set(lvl.product_id, existing);
    }
    const zoneCols = Array.from(usedZones)
      .map((k) => ({
        key: k,
        label: k === UNASSIGNED ? 'unassigned' : (zoneLabel.get(k) ?? k.slice(0, 8)),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    const rows = Array.from(byProduct.values()).sort((a, b) => a.product.localeCompare(b.product));
    return { rows, zoneCols };
  }, [levels, productLabel, zoneLabel]);

  const onExport = () => {
    downloadCsv('stock-levels.csv', toCsv(rows, zoneCols));
  };

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={2} style={{ margin: 0 }}>Stock Levels</Title>
        <Button icon={<DownloadOutlined />} onClick={onExport} disabled={rows.length === 0}>
          Export CSV
        </Button>
      </Space>
      <Card>
        {rows.length === 0 && !isLoading ? (
          <Empty description="No stock levels yet" />
        ) : (
          <Table<PivotRow>
            rowKey="key"
            loading={isLoading}
            dataSource={rows}
            pagination={{ pageSize: 25 }}
            scroll={{ x: 'max-content' }}
            columns={[
              { title: 'Product', dataIndex: 'product', fixed: 'left', width: 280 },
              ...zoneCols.map((z) => ({
                title: z.label,
                dataIndex: ['perZone', z.key],
                align: 'right' as const,
                render: (_: unknown, row: PivotRow) => row.perZone[z.key] ?? 0,
              })),
              {
                title: 'Total',
                dataIndex: 'total',
                fixed: 'right' as const,
                align: 'right' as const,
                render: (v: number) => <b>{v}</b>,
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
