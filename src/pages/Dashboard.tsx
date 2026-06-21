import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Alert from 'antd/es/alert';
import Button from 'antd/es/button';
import Col from 'antd/es/col';
import Row from 'antd/es/row';
import Spin from 'antd/es/spin';
import Space from 'antd/es/space';
import Typography from 'antd/es/typography';
import {
  AlertOutlined,
  DiffOutlined,
  EnvironmentOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  GoldOutlined,
  HddOutlined,
  ReadOutlined,
  ShoppingOutlined,
  SwapOutlined,
  TagOutlined,
} from '@ant-design/icons';
import { KpiTile } from '@/components/KpiTile';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import { useDashboardSparklines } from '@/hooks/useDashboardSparklines';
import { useCardGroup, useUiConfigContext } from '@/lib/uiConfig';
import { usePatchMyUiConfig } from '@/hooks/useUiConfig';
import { pluralizeLabel, type LabelKey } from '@/lib/uiLabels';
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
 * - 9 tiles render in both themes (Devices, Open alerts, Reads/hr, Assets,
 *   Tags, Locations, Tag Transfers, Tag Reconciliation, Low-stock products).
 * - All click-throughs land on a list page pre-filtered to the tile's slice.
 * - Hide / pin order persist **server-side** (`cards.dashboard` via
 *   `PATCH /ui-config/me`), so a user's layout follows them across devices.
 */


interface TileDef {
  id: string;
  title: string;
  /**
   * Sprint 60 (ADR-032 §4) — when set, the card title renders the resolved
   * label skin (pluralized) instead of the static `title`, so `Device` →
   * `Reader` is configuration, not a code edit. Untagged tiles keep `title`.
   */
  labelKey?: LabelKey;
  to: string;
  prefix: ReactNode;
  value: (s: DashboardSummary) => number;
  suffix?: (s: DashboardSummary) => string | undefined;
}

// Locations tile rolls up Sites + Zones into a single card per the sprint-54
// follow-up — primary number is sites, suffix surfaces the zone count.
function locationsSuffix(s: DashboardSummary): string {
  return `· ${s.zones_total} zone${s.zones_total === 1 ? '' : 's'}`;
}

const TILES: TileDef[] = [
  {
    id: 'devices',
    title: 'Devices',
    labelKey: 'device',
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
    to: '/tag-reads',
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
    id: 'tags',
    title: 'Tags',
    to: '/tags',
    prefix: <TagOutlined />,
    value: (s) => s.tags_total,
  },
  {
    id: 'locations',
    title: 'Locations',
    to: '/sites',
    prefix: <EnvironmentOutlined />,
    value: (s) => s.sites_total,
    suffix: locationsSuffix,
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

/**
 * Lightweight `{ id, title }` catalog of the dashboard cards, derived from
 * `TILES` so it can never drift. Consumed by the Preferences page to let a user
 * choose which cards to hide via `cards.dashboard` (`PUT /ui-config/me`).
 */
export const DASHBOARD_CARDS: { id: string; title: string }[] = TILES.map((t) => ({
  id: t.id,
  title: t.title,
}));

export function Dashboard() {
  const { data, isLoading, error } = useDashboardSummary();
  // Sprint 57 Phase F — companion fetch for inline trend chips. Errors are
  // intentionally swallowed: a sparkline outage must not block the headline
  // KPI numbers (graceful degradation per backend contract).
  const { data: sparklines } = useDashboardSparklines();
  const { brandColor } = useThemeMode();
  // Sprint 60 (ADR-032 §4 `labels`) — resolve a tile's display title against
  // the label skin so a `labelKey`-tagged card (e.g. devices → `Reader`)
  // renders the configured term; untagged tiles keep their static title. The
  // skin registry is *singular* ("Reader"), so we pluralize the skinned value;
  // the static `title` is already plural ("Devices"), so the no-skin fallback
  // returns it verbatim (never pluralize it → no "Deviceses").
  const { labels, ready: configReady } = useUiConfigContext();
  const tileTitle = (tile: TileDef): string => {
    if (!tile.labelKey) return tile.title;
    const skin = labels[tile.labelKey];
    return skin ? pluralizeLabel(skin) : tile.title;
  };
  // Sprint 60 (ADR-032 §4 `cards`) — the tenant/role/user-server card config is
  // the *default* layer; the existing device-local localStorage personalisation
  // overrides it when the operator has made an explicit choice on this device.
  // "Reset layout" clears the local choice and reverts to the configured default.
  // Card hide/order now persist server-side (`cards.dashboard`) so a user's
  // layout syncs across devices; the resolved config is the single source of
  // truth and `usePatchMyUiConfig` writes a sparse leaf with an optimistic
  // cache update (so the grid reflects the change before the round-trip).
  const cardConfig = useCardGroup('dashboard');
  const patchUiConfig = usePatchMyUiConfig();
  const [customizing, setCustomizing] = useState(false);

  const effectiveOrder = cardConfig.order;
  const effectiveHidden = cardConfig.hidden;

  // Merge effective order with canonical TILES so newly-shipped tiles auto-append
  // for users who already saved a layout (or whose tenant config omits one).
  const orderedTiles = useMemo<TileDef[]>(() => {
    const byId = new Map(TILES.map((t) => [t.id, t]));
    const seen = new Set<string>();
    const result: TileDef[] = [];
    for (const id of effectiveOrder) {
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
  }, [effectiveOrder]);

  const hidden = useMemo(() => new Set(effectiveHidden), [effectiveHidden]);
  // Wait for the resolved UI config (which carries the user's synced
  // `cards.dashboard` layout) before rendering the grid, so configured-hidden
  // cards never flash visible on first load (worst right after a cold login).
  const cardsReady = configReady;
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
    patchUiConfig.mutate({ cards: { dashboard: { order: next } } });
  };

  const toggleHidden = (id: string): void => {
    const next = hidden.has(id)
      ? [...effectiveHidden].filter((x) => x !== id)
      : [...effectiveHidden, id];
    patchUiConfig.mutate({ cards: { dashboard: { hidden: next } } });
  };

  const resetLayout = (): void => {
    // Clear this user's dashboard layout override — show every card in the
    // default order. (No per-page cards DELETE endpoint exists, so we write an
    // empty leaf rather than re-inheriting a tenant default.)
    patchUiConfig.mutate({ cards: { dashboard: { hidden: [], order: [] } } });
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

      <Row gutter={[16, 16]} align="stretch">
        {!cardsReady ? (
          <Col span={24} style={{ textAlign: 'center', padding: 48 }}>
            <Spin data-testid="dashboard-cards-loading" />
          </Col>
        ) : (
          visibleTiles.map((tile, idx) => {
          const isHidden = hidden.has(tile.id);
          const tileValue = data ? tile.value(data) : 0;
          const tileSuffix = data && tile.suffix ? tile.suffix(data) : undefined;
          const tileSpark = sparklines?.tiles[tile.id];
          const title = tileTitle(tile);
          const card = (
            <KpiTile
              title={title}
              value={tileValue}
              prefix={<span style={{ color: brandColor }}>{tile.prefix}</span>}
              suffix={tileSuffix}
              loading={isLoading}
              interactive={!customizing}
              dimmed={customizing && isHidden}
              sparkline={tileSpark}
              sparklineLabel={title}
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
                      aria-label={`Move ${title} up`}
                      disabled={idx === 0}
                      onClick={() => move(tile.id, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      size="small"
                      aria-label={`Move ${title} down`}
                      disabled={idx === visibleTiles.length - 1}
                      onClick={() => move(tile.id, 1)}
                    >
                      ↓
                    </Button>
                    <Button
                      size="small"
                      icon={isHidden ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                      aria-label={isHidden ? `Show ${title}` : `Hide ${title}`}
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
          })
        )}
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
