/**
 * Subject-scoped telemetry tab (Sprint 21).
 *
 * Reusable across Asset detail and Lot detail. Renders a metric selector,
 * time-range picker, and a Recharts line chart driven by
 * `GET /telemetry/readings?subject_kind=...&subject_id=...`. The metric
 * options come from any `LatestTelemetryEntry` rows embedded on the parent
 * record (cheapest source) so we don't need a second `telemetry_models`
 * lookup keyed on the subject kind.
 */
import { useMemo, useState } from 'react';
import Alert from 'antd/es/alert';
import Empty from 'antd/es/empty';
import Select from 'antd/es/select';
import Space from 'antd/es/space';
import Typography from 'antd/es/typography';
import { TimeRangePicker } from '@/components/TimeRangePicker';
import { TpLineChart, type TpSeries } from '@/components/charts/TpLineChart';
import { useSubjectTelemetry, type SubjectKind } from '@/hooks/useTelemetry';
import { useTenantConfig } from '@/hooks/useTenantConfig';
import type { LatestTelemetryEntry } from '@/api/generated/models/LatestTelemetryEntry';

const { Text } = Typography;

interface Props {
  subjectKind: Exclude<SubjectKind, 'device'>;
  subjectId: string;
  /** Latest-telemetry rows from the parent record (drives the metric picker). */
  latest?: LatestTelemetryEntry[] | null;
}

export function SubjectTelemetryTab({ subjectKind, subjectId, latest }: Props) {
  const { data: tenant } = useTenantConfig();
  const optedIn = (tenant?.telemetry_subject_kinds ?? []).includes(subjectKind);

  const metricOptions = useMemo(
    () =>
      (latest ?? []).map((m) => ({
        value: m.metric_name,
        label: m.unit ? `${m.metric_name} (${m.unit})` : m.metric_name,
      })),
    [latest],
  );
  const [metricName, setMetricName] = useState<string | undefined>();
  const [start, setStart] = useState<string | undefined>();
  const [end, setEnd] = useState<string | undefined>();

  const effectiveMetric = metricName ?? metricOptions[0]?.value;

  const { data: readings, isLoading } = useSubjectTelemetry({
    subject_kind: subjectKind,
    subject_id: subjectId,
    metric_name: effectiveMetric,
    start,
    end,
    limit: 500,
  });

  const chartData = useMemo(
    () =>
      [...(readings ?? [])]
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map((r) => ({ time: r.timestamp, value: r.metric_value })),
    [readings],
  );

  const series = useMemo<TpSeries[]>(
    () => [{ key: 'value', label: effectiveMetric ?? 'value' }],
    [effectiveMetric],
  );

  if (!optedIn) {
    return (
      <Alert
        type="warning"
        showIcon
        message={`Subject-scoped telemetry is not enabled for "${subjectKind}".`}
        description="Ask an admin to enable this subject kind in Tenant Settings → Subject-scoped telemetry."
      />
    );
  }

  if (!effectiveMetric) {
    return <Empty description="No telemetry has been recorded for this subject yet." />;
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          value={effectiveMetric}
          onChange={setMetricName}
          style={{ width: 240 }}
          options={metricOptions}
          placeholder="Metric"
        />
        <TimeRangePicker
          onChange={(s, e) => {
            setStart(s);
            setEnd(e);
          }}
        />
        <Text type="secondary">{readings?.length ?? 0} readings</Text>
      </Space>

      {isLoading ? (
        <TpLineChart data={[]} series={series} xKey="time" height={320} loading />
      ) : (
        <TpLineChart
          data={chartData}
          series={series}
          xKey="time"
          height={320}
          ariaLabel={`${effectiveMetric} over time`}
        />
      )}
    </div>
  );
}
