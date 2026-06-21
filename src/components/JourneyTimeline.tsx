// Sprint 72 (ADR-034 Phase 2) — Journey timeline.
//
// The location "was" narrative: an asset's transit legs (newest-first), each row
// showing origin -> destination, duration, and a cold-chain SLA badge. The open
// (in-transit) leg sits at the top, live. Selecting a leg cross-filters the
// Journey tab's environment chart + map.

import { useMemo } from 'react';
import Empty from 'antd/es/empty';
import Tag from 'antd/es/tag';
import Timeline from 'antd/es/timeline';
import Typography from 'antd/es/typography';
import { useAssetLegs, useZones } from '@/hooks/useAssets';
import type { AssetLegResponse } from '@/api/generated/models/AssetLegResponse';
import { fmtElapsed, fmtDurationMs } from '@/lib/duration';

const { Text } = Typography;

function legDuration(leg: AssetLegResponse): string {
  const end = leg.arrived_at ? new Date(leg.arrived_at).getTime() : Date.now();
  return fmtDurationMs(end - new Date(leg.departed_at).getTime());
}

function slaBadge(leg: AssetLegResponse) {
  if (leg.status === 'open') return <Tag color="processing">in transit</Tag>;
  if (leg.sla_breached == null) return null;
  return leg.sla_breached ? (
    <Tag color="red">SLA breach</Tag>
  ) : (
    <Tag color="green">SLA OK</Tag>
  );
}

export function JourneyTimeline({
  assetId,
  selectedLegId,
  onSelectLeg,
}: {
  assetId: string;
  selectedLegId?: string | null;
  onSelectLeg?: (legId: string | null) => void;
}) {
  const { data: legs } = useAssetLegs(assetId, { limit: 100 });
  const { data: zones } = useZones();

  const zoneName = useMemo(() => {
    const byId = new Map((zones ?? []).map((z) => [z.id, z.name]));
    return (id: string | null | undefined): string =>
      (id ? byId.get(id) : null) ?? 'facility';
  }, [zones]);

  if (!legs || legs.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No journey yet" />;
  }

  const items = legs.map((leg) => {
    const selected = leg.id === selectedLegId;
    const origin = zoneName(leg.origin_zone_id);
    const dest = leg.status === 'open' ? '…' : zoneName(leg.dest_zone_id);
    const color = leg.status === 'open' ? 'blue' : leg.sla_breached ? 'red' : 'green';
    return {
      key: leg.id,
      color,
      children: (
        <div
          role="button"
          tabIndex={0}
          onClick={() => onSelectLeg?.(selected ? null : leg.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSelectLeg?.(selected ? null : leg.id);
          }}
          style={{
            cursor: onSelectLeg ? 'pointer' : 'default',
            padding: '2px 6px',
            borderRadius: 4,
            background: selected ? 'var(--color-fill-tertiary, rgba(0,0,0,0.04))' : undefined,
          }}
        >
          <Text strong>
            {origin} → {dest}
          </Text>{' '}
          <Text type="secondary">· {legDuration(leg)}</Text> {slaBadge(leg)}
          {leg.status === 'closed' && leg.in_range_pct != null && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {leg.temp_min_c != null && leg.temp_max_c != null
                  ? `${leg.temp_min_c.toFixed(1)}–${leg.temp_max_c.toFixed(1)} °C · `
                  : ''}
                {leg.in_range_pct.toFixed(0)}% in range
                {leg.excursion_s ? ` · excursion ${Math.round(leg.excursion_s / 60)}m` : ''}
              </Text>
            </div>
          )}
          {leg.status === 'open' && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                departed {new Date(leg.departed_at).toLocaleString()} · {fmtElapsed(leg.departed_at)}
              </Text>
            </div>
          )}
        </div>
      ),
    };
  });

  return <Timeline items={items} />;
}
