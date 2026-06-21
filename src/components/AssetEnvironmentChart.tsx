// Sprint 72 (ADR-034 Phase 2) — Journey environment chart.
//
// The environment "was" narrative: the fused temperature/humidity series over
// the journey, with the per-tenant cold-chain **SLA band** (from `/state`'s
// resolved `sla`), transit-leg boundaries as vertical guides, and breached legs
// shaded red. Selecting a leg highlights its window.

import { useMemo } from 'react';
import Empty from 'antd/es/empty';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAssetLegs, useAssetState, useAssetStateHistory } from '@/hooks/useAssets';

function fmtTick(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function AssetEnvironmentChart({
  assetId,
  selectedLegId,
}: {
  assetId: string;
  selectedLegId?: string | null;
}) {
  const { data: history } = useAssetStateHistory(assetId, { limit: 500 });
  const { data: legs } = useAssetLegs(assetId, { limit: 100 });
  const { data: state } = useAssetState(assetId);
  const sla = state?.sla ?? null;

  const data = useMemo(() => {
    const rows = [...(history ?? [])].reverse(); // history is newest-first.
    return rows.map((r) => ({
      t: new Date(r.time).getTime(),
      temp: r.temperature_c ?? null,
      hum: r.humidity_pct ?? null,
    }));
  }, [history]);

  if (data.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No environment history yet" />;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="t"
          type="number"
          domain={['dataMin', 'dataMax']}
          scale="time"
          tickFormatter={fmtTick}
        />
        <YAxis yAxisId="temp" unit="°C" width={48} />
        <YAxis yAxisId="hum" orientation="right" unit="%" width={40} domain={[0, 100]} />
        <Tooltip
          labelFormatter={(ms) => new Date(Number(ms)).toLocaleString()}
          formatter={(v: number, name: string) => [v, name === 'temp' ? '°C' : '%']}
        />
        {/* SLA target band (temperature) + humidity ceiling, when configured. */}
        {sla?.temp_min_c != null && sla?.temp_max_c != null && (
          <ReferenceArea
            yAxisId="temp"
            y1={sla.temp_min_c}
            y2={sla.temp_max_c}
            fill="var(--color-success)"
            fillOpacity={0.08}
            ifOverflow="extendDomain"
          />
        )}
        {sla?.temp_max_c != null && (
          <ReferenceLine
            yAxisId="temp"
            y={sla.temp_max_c}
            stroke="var(--color-success)"
            strokeDasharray="4 2"
          />
        )}
        {sla?.temp_min_c != null && (
          <ReferenceLine
            yAxisId="temp"
            y={sla.temp_min_c}
            stroke="var(--color-success)"
            strokeDasharray="4 2"
          />
        )}
        {sla?.humidity_max != null && (
          <ReferenceLine
            yAxisId="hum"
            y={sla.humidity_max}
            stroke="var(--color-accent)"
            strokeDasharray="4 2"
          />
        )}
        {/* Leg boundaries + breach / selection shading. */}
        {(legs ?? []).map((leg) => {
          const x1 = new Date(leg.departed_at).getTime();
          const lastT = data.at(-1)?.t ?? Date.now();
          const x2 = leg.arrived_at ? new Date(leg.arrived_at).getTime() : lastT;
          const selected = leg.id === selectedLegId;
          const fill = selected
            ? 'var(--color-accent)'
            : leg.sla_breached
              ? 'var(--color-danger)'
              : undefined;
          return (
            <ReferenceArea
              key={leg.id}
              yAxisId="temp"
              x1={x1}
              x2={x2}
              fill={fill}
              fillOpacity={selected ? 0.12 : leg.sla_breached ? 0.1 : 0}
              ifOverflow="hidden"
            />
          );
        })}
        {(legs ?? []).map((leg) => (
          <ReferenceLine
            key={`dep-${leg.id}`}
            yAxisId="temp"
            x={new Date(leg.departed_at).getTime()}
            stroke="var(--color-border)"
            strokeDasharray="2 2"
          />
        ))}
        <Line
          yAxisId="temp"
          type="monotone"
          dataKey="temp"
          name="temp"
          stroke="var(--color-warning)"
          dot={false}
          connectNulls
          isAnimationActive={false}
        />
        <Line
          yAxisId="hum"
          type="monotone"
          dataKey="hum"
          name="hum"
          stroke="var(--color-accent)"
          dot={false}
          connectNulls
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
