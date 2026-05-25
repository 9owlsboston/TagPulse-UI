import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Alert from 'antd/es/alert';
import Button from 'antd/es/button';
import Col from 'antd/es/col';
import Row from 'antd/es/row';
import Space from 'antd/es/space';
import Typography from 'antd/es/typography';
import {
  AlertOutlined,
  DiffOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  GoldOutlined,
  HddOutlined,
  ReadOutlined,
  ShoppingOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { KpiTile } from '@/components/KpiTile';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import { useThemeMode } from '@/theme/ThemeProvider';
import type { DashboardSummary } from '@/types';

/**
 * Operator landing page — Sprint 54.4 rewrite (ADR-029 + sprint-54 UI overhaul).
 *
 * Replaces the previous draggable `react-grid-layout` board with a static
 * responsive grid driven by a single `/dashboard/summary` fetch. Personalisation
 * is intentionally LocalStorage-only (no backend persistence): order + hide on
 * one device only. This keeps the contract narrow — the server stays unaware
 * of UI preferences and the tile catalog can evolve without migrations.
 *
 * Pass-bar (design doc §54.4):
 * - 8 tiles render in both themes.
 * - All click-throughs land on a list page pre-filtered to the tile's slice.
 * - Pin order persists across reload.
 */

const ORDER_KEY = 'tagpulse.dashboard.tileOrder';
const HIDDEN_KEY = 'tagpulse.dashboard.tileHidden';

interface TileDef {
  id: string;
  title: string;
  to: string;
  prefix: ReactNode;
  value: (s: DashboardSummary) => number;
  suffix?: (s: DashboardSummary) => string | undefined;
}

const TILES: TileDef[] = [
  {
    id: 'devices',
    title: 'Devices',
    to: '/devices',
    prefix: <HddOutlined />,
    value: (s) => s.devices_online,
    suffix: (s) => `/ ${s.devices_total}`,
  },
  {
    id: 'alerts-open',
    title: 'Open alerts (24h)',
    to: '/alerts?status=open&since=24h',
    prefix: <AlertOutlined />,
    value: (s) => s.alerts_open_24h,
  },
  {
    id: 'reads-per-hour',
    title: 'Reads / hour',
    to: '/telemetry',
    prefix: <ReadOutlined />,
    value: (s) => s.reads_per_hour_now,
  },
  {
    id: 'assets-active',
    title: 'Assets',
    to: '/assets?status=active',
    prefix: <GoldOutlined />,
    value: (s) => s.assets_active,
  },
  {
    id: 'transfers-in-flight',
    title: 'Tag Transfers',
    to: '/tag-transfers?status=requested',
    prefix: <SwapOutlined />,
    value: (s) => s.tag_transfers_in_flight,
  },
  {
    id: 'recon-backlog',
    title: 'Tag Reconciliation',
    to: '/tags/reconciliation',
    prefix: <DiffOutlined />,
    value: (s) => s.tag_recon_backlog,
  },
  {
    id: 'low-stock',
    title: 'Low-stock products',
    to: '/inventory/stock-levels?low=1',
    prefix: <ShoppingOutlined />,
    value: (s) => s.low_stock_count,
  },
];

function loadIds(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveIds(key: string, value: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* localStorage may be disabled / full — ignore, personalisation is best-effort */
  }
}

export function Dashboard() {
  const { data, isLoading, error } = useDashboardSummary();
  const { brandColor } = useThemeMode();
  const [orderState, setOrderState] = useState<string[]>(() => loadIds(ORDER_KEY));
  const [hiddenState, setHiddenState] = useState<string[]>(() => loadIds(HIDDEN_KEY));
  const [customizing, setCustomizing] = useState(false);

  // Merge saved order with canonical TILES so newly-shipped tiles auto-append
  // for users who already saved a layout.
  const orderedTiles = useMemo<TileDef[]>(() => {
    const byId = new Map(TILES.map((t) => [t.id, t]));
    const seen = new Set<string>();
    const result: TileDef[] = [];
    for (const id of orderState) {
      const tile = byId.get(id);
      if (tile && !seen.has(id)) {
        result.push(tile);
        seen.add(id);
      }
    }
    for (const tile of TILES) {
      if (!seen.has(tile.id)) result.push(tile);
    }
    return result;
  }, [orderState]);

  const hidden = useMemo(() => new Set(hiddenState), [hiddenState]);
  const visibleTiles = customizing
    ? orderedTiles
    : orderedTiles.filter((t) => !hidden.has(t.id));

  const move = (id: string, dir: -1 | 1): void => {
    const cur = orderedTiles.map((t) => t.id);
    const idx = cur.indexOf(id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= cur.length) return;
    const next = [...cur];
    const a = next[idx];
    const b = next[swap];
    if (a === undefined || b === undefined) return;
    next[idx] = b;
    next[swap] = a;
    setOrderState(next);
    saveIds(ORDER_KEY, next);
  };

  const toggleHidden = (id: string): void => {
    const next = hidden.has(id) ? hiddenState.filter((x) => x !== id) : [...hiddenState, id];
    setHiddenState(next);
    saveIds(HIDDEN_KEY, next);
  };

  const resetLayout = (): void => {
    setOrderState([]);
    setHiddenState([]);
    saveIds(ORDER_KEY, []);
    saveIds(HIDDEN_KEY, []);
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Typography.Title level={2} style={{ margin: 0 }}>
          Dashboard
        </Typography.Title>
        <Space>
          {customizing && (
            <Button size="small" onClick={resetLayout}>
              Reset layout
            </Button>
          )}
          <Button
            size="small"
            type={customizing ? 'primary' : 'default'}
            onClick={() => setCustomizing((c) => !c)}
          >
            {customizing ? 'Done' : 'Customize'}
          </Button>
        </Space>
      </div>

      {error && (
        <Alert
          type="error"
          message="Failed to load dashboard summary"
          description={(error as Error).message}
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[16, 16]}>
        {visibleTiles.map((tile, idx) => {
          const isHidden = hidden.has(tile.id);
          const tileValue = data ? tile.value(data) : 0;
          const tileSuffix = data && tile.suffix ? tile.suffix(data) : undefined;
          const card = (
            <KpiTile
              title={tile.title}
              value={tileValue}
              prefix={<span style={{ color: brandColor }}>{tile.prefix}</span>}
              suffix={tileSuffix}
              loading={isLoading}
              interactive={!customizing}
              dimmed={customizing && isHidden}
            />
          );
          return (
            <Col key={tile.id} xs={24} sm={12} lg={6}>
              {customizing ? (
                <div data-testid={`tile-${tile.id}`}>
                  {card}
                  <Space style={{ marginTop: 8 }} wrap>
                    <Button
                      size="small"
                      aria-label={`Move ${tile.title} up`}
                      disabled={idx === 0}
                      onClick={() => move(tile.id, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      size="small"
                      aria-label={`Move ${tile.title} down`}
                      disabled={idx === visibleTiles.length - 1}
                      onClick={() => move(tile.id, 1)}
                    >
                      ↓
                    </Button>
                    <Button
                      size="small"
                      icon={isHidden ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                      aria-label={isHidden ? `Show ${tile.title}` : `Hide ${tile.title}`}
                      onClick={() => toggleHidden(tile.id)}
                    />
                  </Space>
                </div>
              ) : (
                <Link
                  to={tile.to}
                  data-testid={`tile-${tile.id}`}
                  style={{ display: 'block', color: 'inherit' }}
                >
                  {card}
                </Link>
              )}
            </Col>
          );
        })}
      </Row>

      {data && (
        <Typography.Paragraph
          type="secondary"
          style={{ marginTop: 16, fontSize: 12 }}
          data-testid="dashboard-updated-at"
        >
          Updated {new Date(data.generated_at).toLocaleTimeString()}
        </Typography.Paragraph>
      )}
    </div>
  );
}
