import { useMemo, useState } from 'react';
import Empty from 'antd/es/empty';
import Select from 'antd/es/select';
import Space from 'antd/es/space';
import Tag from 'antd/es/tag';
import AntTooltip from 'antd/es/tooltip';
import Typography from 'antd/es/typography';
import { TimeRangePicker } from '@/components/TimeRangePicker';
import { TpLineChart, type TpSeries } from '@/components/charts/TpLineChart';
import { useTelemetryModels } from '@/hooks/useTelemetryModels';
import { useDeviceTelemetry } from '@/hooks/useTelemetry';
import type { DeviceTelemetryReading, MetricDefinition } from '@/types';

const { Text, Title } = Typography;

interface Props {
  deviceId: string;
  deviceType: string;
}

export function DeviceTelemetryTab({ deviceId, deviceType }: Props) {
  const { data: models } = useTelemetryModels();
  const model = models?.find((m) => m.device_type === deviceType);
  const metrics: MetricDefinition[] = model?.metrics ?? [];

  const [metricName, setMetricName] = useState<string | undefined>();
  const [start, setStart] = useState<string | undefined>();
  const [end, setEnd] = useState<string | undefined>();
  // Sprint 21: filter readings whose `metadata.subject_kind` matches the
  // selection. When `all` (default), no filtering applied. The backend
  // device-scoped endpoint returns rows that may carry a resolved subject in
  // `metadata` (set by the tag-borne fan-out path); this lets operators
  // narrow to just the device-self rows or just the tag-borne ones.
  const [subjectKindFilter, setSubjectKindFilter] = useState<string>('all');

  const effectiveMetric = metricName ?? metrics[0]?.name;
  const { data: rawReadings, isLoading } = useDeviceTelemetry({
    device_id: deviceId,
    metric_name: effectiveMetric,
    start,
    end,
    limit: 500,
  });

  const readings = useMemo(() => {
    if (subjectKindFilter === 'all') return rawReadings ?? [];
    return (rawReadings ?? []).filter((r) => {
      const sk = r.metadata?.subject_kind;
      if (subjectKindFilter === 'device') {
        // Treat missing subject_kind as 'device' (legacy device-only rows).
        return !sk || sk === 'device';
      }
      return sk === subjectKindFilter;
    });
  }, [rawReadings, subjectKindFilter]);

  const metricDef = metrics.find((m) => m.name === effectiveMetric);
  const unit = metricDef?.unit ?? readings?.[0]?.unit ?? '';

  const chartData = useMemo(
    () =>
      [...(readings ?? [])]
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map((r) => ({
          time: r.timestamp,
          value: r.metric_value,
        })),
    [readings],
  );

  const series = useMemo<TpSeries[]>(
    () => [{ key: 'value', label: effectiveMetric ?? 'value' }],
    [effectiveMetric],
  );

  const tagSourceCount = useMemo(
    () =>
      (readings ?? []).reduce(
        (n: number, r: DeviceTelemetryReading) => (r.metadata?.source === 'tag' ? n + 1 : n),
        0,
      ),
    [readings],
  );

  if (!effectiveMetric) {
    return (
      <Empty
        description={
          <span>
            No telemetry model defined for device type <code>{deviceType}</code>.
          </span>
        }
      />
    );
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          value={effectiveMetric}
          onChange={setMetricName}
          style={{ width: 220 }}
          options={metrics.map((m) => ({
            label: `${m.name}${m.unit ? ` (${m.unit})` : ''}`,
            value: m.name,
          }))}
        />
        <TimeRangePicker
          onChange={(s, e) => {
            setStart(s);
            setEnd(e);
          }}
        />
        <Select
          value={subjectKindFilter}
          onChange={setSubjectKindFilter}
          style={{ width: 200 }}
          options={[
            { label: 'All subject kinds', value: 'all' },
            { label: 'Device (self)', value: 'device' },
            { label: 'Asset (tag-borne)', value: 'asset' },
            { label: 'Lot (tag-borne)', value: 'lot' },
            { label: 'Stock item (tag-borne)', value: 'stock_item' },
          ]}
        />
        {tagSourceCount > 0 && (
          <AntTooltip title="Some readings were mirrored from tag_data on a tag_read row (RFID sensor tag).">
            <Tag color="blue">source: tag ({tagSourceCount})</Tag>
          </AntTooltip>
        )}
      </Space>
      <Title level={5} style={{ marginTop: 0 }}>
        {effectiveMetric}
        {unit && <Text type="secondary"> ({unit})</Text>}
      </Title>
      {isLoading ? (
        <TpLineChart data={[]} series={series} xKey="time" height={320} loading />
      ) : (
        <TpLineChart
          data={chartData}
          series={series}
          xKey="time"
          height={320}
          yLabel={unit || undefined}
          ariaLabel={`${effectiveMetric} over time`}
        />
      )}
    </div>
  );
}
