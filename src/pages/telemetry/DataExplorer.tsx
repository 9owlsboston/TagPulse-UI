import { useState, useMemo } from 'react';
import { Table, Select, Form, InputNumber, Button, Space, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { TimeRangePicker } from '@/components/TimeRangePicker';
import { useTagReads } from '@/hooks/useTagReads';
import { useDevices } from '@/hooks/useDevices';
import type { TagReadResponse } from '@/types';

const { Title } = Typography;

const columns: ColumnsType<TagReadResponse> = [
  { title: 'Tag ID', dataIndex: 'tag_id' },
  { title: 'Device', dataIndex: 'device_id' },
  {
    title: 'Timestamp',
    dataIndex: 'timestamp',
    render: (v: string) => new Date(v).toLocaleString(),
    sorter: (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  },
  { title: 'Signal', dataIndex: 'signal_strength', render: (v: number | null) => v ?? '—' },
];

export function DataExplorer() {
  const [deviceId, setDeviceId] = useState<string | undefined>();
  const [tagId, setTagId] = useState<string | undefined>();
  const [start, setStart] = useState<string | undefined>();
  const [end, setEnd] = useState<string | undefined>();
  const [limit, setLimit] = useState(100);

  const { data: devices } = useDevices();
  const { data, isLoading } = useTagReads({ device_id: deviceId, tag_id: tagId, start, end, limit });

  const deviceOptions = useMemo(
    () => [
      { label: 'All Devices', value: '' },
      ...(devices ?? []).map((d) => ({ label: d.name, value: d.id })),
    ],
    [devices],
  );

  const handleExportCsv = () => {
    if (!data?.length) return;
    const headers = ['tag_id', 'device_id', 'timestamp', 'signal_strength'];
    const rows = data.map((r) => [r.tag_id, r.device_id, r.timestamp, r.signal_strength ?? ''].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tag-reads.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Title level={2}>Data Explorer</Title>
      <Form layout="inline" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <Form.Item label="Device">
          <Select
            options={deviceOptions}
            value={deviceId ?? ''}
            onChange={(v) => setDeviceId(v || undefined)}
            style={{ width: 200 }}
          />
        </Form.Item>
        <Form.Item label="Tag ID">
          <Select
            mode="tags"
            placeholder="Filter by tag"
            style={{ width: 200 }}
            onChange={(v: string[]) => setTagId(v[0] || undefined)}
          />
        </Form.Item>
        <Form.Item label="Limit">
          <InputNumber min={1} max={1000} value={limit} onChange={(v) => setLimit(v ?? 100)} />
        </Form.Item>
      </Form>
      <Space style={{ marginBottom: 16 }}>
        <TimeRangePicker onChange={(s, e) => { setStart(s); setEnd(e); }} />
        <Button onClick={handleExportCsv} disabled={!data?.length}>Export CSV</Button>
      </Space>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={isLoading}
        pagination={{ pageSize: 20 }}
      />
    </div>
  );
}
