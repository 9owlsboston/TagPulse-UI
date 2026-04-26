import { Card, Statistic } from 'antd';
import type { ReactNode } from 'react';

interface KpiTileProps {
  title: string;
  value: number | string;
  prefix?: ReactNode;
  loading?: boolean;
}

export function KpiTile({ title, value, prefix, loading }: KpiTileProps) {
  return (
    <Card>
      <Statistic title={title} value={value} prefix={prefix} loading={loading} />
    </Card>
  );
}
