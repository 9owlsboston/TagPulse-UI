// Sprint 71 (ADR-034) — Asset "Current" card.
//
// Renders the fused asset-state snapshot from `GET /assets/{id}/state`: the
// consolidation worker's `read_count × recency`-weighted fusion of the asset's
// bound-tag reads into one zone + environment answer ("is"), plus a compact
// custody / environment mini-history from `…/state/history` ("was").
//
// Presentational: takes only the assetId and fetches its own data, mirroring
// the other self-contained asset tabs.

import { useMemo } from 'react';
import Card from 'antd/es/card';
import Descriptions from 'antd/es/descriptions';
import Empty from 'antd/es/empty';
import Space from 'antd/es/space';
import Tag from 'antd/es/tag';
import Timeline from 'antd/es/timeline';
import Tooltip from 'antd/es/tooltip';
import Typography from 'antd/es/typography';
import { useAssetState, useAssetStateHistory, useZones } from '@/hooks/useAssets';
import { fmtElapsed } from '@/lib/duration';
import type { AssetStateResponse } from '@/api/generated/models/AssetStateResponse';

const { Text } = Typography;

const FRAME_COLOR: Record<string, string> = {
  reader: 'blue',
  floor: 'green',
  geo: 'orange',
  none: 'default',
};

const FRAME_LABEL: Record<string, string> = {
  reader: 'Reader zone',
  floor: 'Floor',
  geo: 'Geo',
  none: 'Unknown',
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function AssetCurrentStateCard({ assetId }: { assetId: string }) {
  const { data: state } = useAssetState(assetId);
  const { data: history } = useAssetStateHistory(assetId, { limit: 200 });
  const { data: zones } = useZones();

  const zoneName = useMemo(() => {
    const byId = new Map((zones ?? []).map((z) => [z.id, z.name]));
    return (id: string | null | undefined): string | null =>
      id ? (byId.get(id) ?? null) : null;
  }, [zones]);

  // "Where" label: in transit shows the open leg (origin + elapsed); else a
  // named zone when resolved; else "In transit" for a bare geo fix; else frame.
  const whereLabel = (s: AssetStateResponse): string => {
    if (s.open_leg) {
      const origin = zoneName(s.open_leg.origin_zone_id) ?? 'origin';
      return `In transit: ${origin} → … · ${fmtElapsed(s.open_leg.departed_at)}`;
    }
    const zn = zoneName(s.zone_id);
    if (zn) return zn;
    if (s.frame === 'geo') return 'In transit';
    return FRAME_LABEL[s.frame] ?? s.frame;
  };

  // Custody timeline: history rows where the frame changed (newest-first).
  const custody = useMemo(() => {
    const rows = history ?? [];
    const out: { at: string; from: string; to: string }[] = [];
    // history is newest-first; walk oldest→newest to detect transitions.
    const asc = [...rows].reverse();
    let prev: string | null = null;
    for (const r of asc) {
      if (prev !== null && prev !== r.frame) {
        out.push({ at: r.time, from: prev, to: r.frame });
      }
      prev = r.frame;
    }
    return out.reverse().slice(0, 5);
  }, [history]);

  if (!state) {
    return (
      <Card size="small" title="Current (fused)">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No fused snapshot yet"
        />
      </Card>
    );
  }

  return (
    <Card
      size="small"
      title={
        <Space>
          <span>Current (fused)</span>
          <Tooltip title="read_count × recency-weighted fusion of this asset's bound-tag reads over the look-back window">
            <Tag color={FRAME_COLOR[state.frame] ?? 'default'}>
              {FRAME_LABEL[state.frame] ?? state.frame}
            </Tag>
          </Tooltip>
        </Space>
      }
    >
      <Descriptions column={2} size="small">
        <Descriptions.Item label="Where" span={2}>
          {whereLabel(state)}
        </Descriptions.Item>
        <Descriptions.Item label="Temperature">
          {state.temperature_c != null ? `${state.temperature_c.toFixed(1)} °C` : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Humidity">
          {state.humidity_pct != null ? `${state.humidity_pct.toFixed(0)} %` : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Contributing tags">{state.tag_count}</Descriptions.Item>
        <Descriptions.Item label="Samples">{state.sample_count}</Descriptions.Item>
        <Descriptions.Item label="Confidence">
          {state.confidence != null ? state.confidence.toFixed(2) : '—'}
        </Descriptions.Item>
        <Descriptions.Item label="Updated">{fmtTime(state.time)}</Descriptions.Item>
      </Descriptions>

      {custody.length > 0 && (
        <>
          <Text strong style={{ display: 'block', marginTop: 12, marginBottom: 8 }}>
            Custody
          </Text>
          <Timeline
            items={custody.map((c, i) => ({
              key: `${c.at}-${i}`,
              color: FRAME_COLOR[c.to] ?? 'gray',
              children: (
                <Text>
                  <Tag color={FRAME_COLOR[c.from] ?? 'default'}>
                    {FRAME_LABEL[c.from] ?? c.from}
                  </Tag>
                  →{' '}
                  <Tag color={FRAME_COLOR[c.to] ?? 'default'}>
                    {FRAME_LABEL[c.to] ?? c.to}
                  </Tag>{' '}
                  <Text type="secondary">{fmtTime(c.at)}</Text>
                </Text>
              ),
            }))}
          />
        </>
      )}
    </Card>
  );
}
