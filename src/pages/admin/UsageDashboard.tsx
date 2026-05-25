import { useMemo } from 'react';
import Typography from 'antd/es/typography';
import Table from 'antd/es/table';
import Progress from 'antd/es/progress';
import Spin from 'antd/es/spin';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useUsage, useUsageSummary } from '@/hooks/useUsage';
import { cssVar } from '@/theme/tokens';
import type { UsageSummary } from '@/types';

const { Title } = Typography;

const QUOTA_LIMITS: Record<string, number> = {
  api_read: 100_000,
  api_write: 50_000,
  ingestion: 1_000_000,
  rule_evaluations: 500_000,
  alerts_fired: 10_000,
  webhook_deliveries: 50_000,
  sse_connections: 1_000,
  export_volume: 100_000,
};

const COLORS: Record<string, string> = {
  api_read: cssVar.chart(1),
  api_write: cssVar.chart(2),
  ingestion: cssVar.chart(3),
  rule_evaluations: cssVar.chart(5),
  alerts_fired: cssVar.chart(4),
  webhook_deliveries: cssVar.chart(6),
};

export function UsageDashboard() {
  const { data: usage, isLoading: usageLoading } = useUsage();
  const { data: summary, isLoading: summaryLoading } = useUsageSummary();

  const chartData = useMemo(() => {
    const dateMap = new Map<string, Record<string, number>>();
    for (const r of usage ?? []) {
      const date = new Date(r.usage_date).toLocaleDateString();
      const entry = dateMap.get(date) ?? {};
      entry[r.dimension] = (entry[r.dimension] ?? 0) + r.quantity;
      dateMap.set(date, entry);
    }
    return Array.from(dateMap.entries()).map(([date, dims]) => ({ date, ...dims }));
  }, [usage]);

  const dimensions = useMemo(() => {
    const set = new Set<string>();
    for (const r of usage ?? []) set.add(r.dimension);
    return Array.from(set);
  }, [usage]);

  const summaryColumns = [
    { title: 'Dimension', dataIndex: 'dimension' as keyof UsageSummary },
    { title: 'Total', dataIndex: 'total_quantity' as keyof UsageSummary, render: (v: number) => v.toLocaleString() },
    { title: 'Unit', dataIndex: 'unit' as keyof UsageSummary },
    {
      title: 'Quota',
      render: (_: unknown, record: UsageSummary) => {
        const limit = QUOTA_LIMITS[record.dimension];
        if (!limit) return '—';
        const pct = Math.round((record.total_quantity / limit) * 100);
        return <Progress percent={pct} size="small" status={pct >= 90 ? 'exception' : 'normal'} />;
      },
    },
  ];

  if (usageLoading || summaryLoading) return <Spin size="large" />;

  return (
    <div>
      <Title level={2}>Usage & Billing</Title>

      <Title level={4}>Daily Usage</Title>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          {dimensions.map((dim) => (
            <Bar key={dim} dataKey={dim} fill={COLORS[dim] ?? cssVar.textMuted} />
          ))}
        </BarChart>
      </ResponsiveContainer>

      <Title level={4} style={{ marginTop: 24 }}>Summary</Title>
      <Table<UsageSummary>
        rowKey="dimension"
        columns={summaryColumns}
        dataSource={summary}
        pagination={false}
      />
    </div>
  );
}
