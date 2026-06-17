import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from 'antd/es/button';
import Checkbox from 'antd/es/checkbox';
import DatePicker from 'antd/es/date-picker';
import Form from 'antd/es/form';
import Input from 'antd/es/input';
import Modal from 'antd/es/modal';
import Select from 'antd/es/select';
import Space from 'antd/es/space';
import Table from 'antd/es/table';
import Tag from 'antd/es/tag';
import Tooltip from 'antd/es/tooltip';
import Typography from 'antd/es/typography';
import message from 'antd/es/message';
import { ListPageShell } from '@/components/ListPageShell';
import { FilterOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useAssets, useAssetsCurrentLocations, useCreateAsset } from '@/hooks/useAssets';
import { useLabel } from '@/lib/uiConfig';
import { useCategories } from '@/hooks/useCategories';
import { useCanPerform } from '@/components/useCanPerform';
import { useTenantConfig } from '@/hooks/useTenantConfig';
import { useColumnGroup, useTableConfig } from '@/lib/uiConfig';
import { applyColumnConfig, applyDefaultSort, columnKey, hasAdvancedColumns, type KeyedColumn } from '@/lib/columnConfig';
import { useLocalColumnVisibility } from '@/lib/useLocalColumnVisibility';
import { ColumnChooser, type ColumnChooserItem } from '@/components/ColumnChooser';
import { CategorySelect } from '@/components/CategorySelect';
import {
  PendingLabelPicker,
  attachPendingLabels,
  type PendingLabel,
} from '@/components/PendingLabelPicker';
import { FilterPanel } from '@/components/FilterPanel';
import { EmptyState } from '@/components/EmptyState';
import type { LabelFilter } from '@/lib/labelFilter';
import { isEmptyLabelFilter } from '@/lib/labelFilter';
import type { AssetResponse } from '@/api/generated/models/AssetResponse';
import type { AssetCurrentLocation } from '@/api/generated/models/AssetCurrentLocation';
import { AssetCreate } from '@/api/generated/models/AssetCreate';

const { RangePicker } = DatePicker;

// Sprint 60 (ADR-032 §6.3) — config-driven column presets. The registration
// date is genuinely low-value for daily floor ops, so it is default-OFF behind
// the "Advanced columns" toggle; `external_ref` stays visible (it's a business
// cross-reference to the operator's WMS, not plumbing). A tenant's
// `columns.assets.{hidden,order,advanced}` / `tables.assets.defaultSort`
// further tailor the table — any column can be hidden/reordered/advanced.
const ASSETS_PAGE = 'assets';
const DEFAULT_ADVANCED_COLUMNS = ['created_at'];
type AssetColumn = ColumnsType<AssetResponse>[number];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'retired', label: 'Retired' },
  { value: 'lost', label: 'Lost' },
];

const STATUS_COLOR: Record<string, string> = {
  active: 'green',
  retired: 'default',
  lost: 'red',
};

const STATUS_FILTERS = [
  { text: 'Active', value: 'active' },
  { text: 'Retired', value: 'retired' },
  { text: 'Lost', value: 'lost' },
];

const SOURCE_FILTERS = [
  { text: 'RFID', value: 'rfid' },
  { text: 'GPS', value: 'gps' },
  { text: 'External', value: 'external' },
  { text: 'No fix', value: '__none__' },
];

const LAST_SEEN_PRESETS: { label: string; value: [Dayjs, Dayjs] }[] = [
  { label: 'Last hour', value: [dayjs().subtract(1, 'hour'), dayjs()] },
  { label: 'Last 24 hours', value: [dayjs().subtract(24, 'hour'), dayjs()] },
  { label: 'Last 7 days', value: [dayjs().subtract(7, 'day'), dayjs()] },
  { label: 'Last 30 days', value: [dayjs().subtract(30, 'day'), dayjs()] },
];

// Stock-ticker style row-flash (Option B). Caps how many rows can flash per
// poll cycle so a fleet-wide simultaneous update doesn't strobe the page.
const MAX_FLASHES_PER_REFRESH = 12;
const FLASH_DURATION_MS = 900;

export function AssetList() {
  const assetsLabel = useLabel('asset', { plural: true });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(() => {
    // Sprint 54.4 — dashboard "Active assets" tile deep-links with ?status=active.
    const s = searchParams.get('status') ?? '';
    return ['active', 'retired', 'lost'].includes(s) ? s : '';
  });
  // Sprint 42 — list-page Category filter is now multi-select. The wire
  // shape is `?category_ids=A&category_ids=B` (FastAPI default for
  // `list[UUID]`); `useAssets` falls back to the raw `request()` helper
  // for that path because the generated fetch client would otherwise
  // serialise the array as a single CSV value. The Sprint 37 single-value
  // `?category_id=` query param remains supported server-side for callers
  // that still use it.
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [lastSeenRange, setLastSeenRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [neverSeenOnly, setNeverSeenOnly] = useState(false);
  // Sprint 37 row 3.9b / Sprint 42 — label filter, now wired through the
  // FilterPanel side panel rather than the inline header strip.
  const [labelFilter, setLabelFilter] = useState<LabelFilter>({});
  // Sprint 42 — side filter panel visibility.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { data, isLoading } = useAssets({
    q: search || undefined,
    status: status || undefined,
    category_ids: categoryIds.length > 0 ? categoryIds : undefined,
    labels: labelFilter,
  });
  const { data: locations } = useAssetsCurrentLocations();
  const { data: tenant } = useTenantConfig();
  const showTemperature = (tenant?.telemetry_subject_kinds ?? []).includes('asset');
  const createAsset = useCreateAsset();
  const canEdit = useCanPerform('editor');
  // Sprint 37 row 3.9d — labels queued client-side in the Create modal,
  // flushed via attachPendingLabels() after the entity_id is known.
  const [pendingLabels, setPendingLabels] = useState<PendingLabel[]>([]);
  // Categories rarely change between mutations (60 s staleTime in the hook),
  // so loading them once here powers both the table column rendering and
  // the filter — no per-row N+1 fetches.
  const { data: categories } = useCategories({ limit: 200 });
  const categoryById = useMemo(() => {
    const map = new Map<string, { name: string; category_type: string }>();
    for (const c of categories ?? []) {
      map.set(c.id, { name: c.name, category_type: c.category_type });
    }
    return map;
  }, [categories]);

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<AssetCreate>();

  // Sprint 60 (ADR-032 §6.3) — config-driven column presets + advanced toggle.
  const columnConfig = useColumnGroup(ASSETS_PAGE);
  const tableConfig = useTableConfig(ASSETS_PAGE);
  const colVis = useLocalColumnVisibility(ASSETS_PAGE);
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Lightweight key list for the toggle-availability check (the full column
  // defs are applied inline below; this mirrors their addressable keys).
  const baseColumnKeys = useMemo(
    () => [
      { key: 'name' },
      { key: 'category' },
      { key: 'external_ref' },
      { key: 'status' },
      { key: 'location' },
      { key: 'last_seen' },
      { key: 'created_at' },
      ...(showTemperature ? [{ key: 'temperature' }] : []),
    ],
    [showTemperature],
  );

  // Sprint 54.4 — re-apply URL-param status when the dashboard navigates
  // between tiles without a full reload.
  useEffect(() => {
    const s = searchParams.get('status') ?? '';
    if (['active', 'retired', 'lost', ''].includes(s)) setStatus(s);
  }, [searchParams]);

  const rows = useMemo(() => data ?? [], [data]);
  const locationByAssetId = useMemo(() => {
    const map = new Map<string, AssetCurrentLocation>();
    for (const loc of locations ?? []) {
      map.set(loc.asset_id, loc);
    }
    return map;
  }, [locations]);

  // Sprint 41 Phase F7 — the legacy asset-type column-header filter was
  // dropped here; Category (top-of-page filter + table column) is the sole
  // classifier now. `assets.asset_type` itself is dropped in Sprint 41 Phase
  // H (backend); this UI change goes out one sprint ahead.

  // Client-side narrow on top of the server-fetched page: applies the
  // last-seen range and the "never seen" toggle. Category and label
  // filters are server-side (see `useAssets({ category_ids, labels })`
  // above).
  const filteredRows = useMemo(() => {
    const from = lastSeenRange?.[0]?.valueOf();
    const to = lastSeenRange?.[1]?.valueOf();
    return rows.filter((r) => {
      const loc = locationByAssetId.get(r.id);
      if (neverSeenOnly) return !loc;
      if (from || to) {
        if (!loc) return false;
        const ts = Date.parse(loc.recorded_at);
        if (from && ts < from) return false;
        if (to && ts > to) return false;
      }
      return true;
    });
  }, [rows, locationByAssetId, lastSeenRange, neverSeenOnly]);

  // ── Row-flash on new fix ──────────────────────────────────────────────
  // Track the previous `recorded_at` per asset; when it advances, flash the
  // row green for FLASH_DURATION_MS. Throttled to MAX_FLASHES_PER_REFRESH
  // so a synchronized fleet-wide refresh stays calm. Per-row cooldown:
  // re-entering the flash set restarts the timer.
  const lastRecordedRef = useRef<Map<string, string>>(new Map());
  const flashTimersRef = useRef<Map<string, number>>(new Map());
  const seededRef = useRef(false);
  const [flashing, setFlashing] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!locations) return;
    // First payload: just seed the baseline. Don't flash everything as
    // "new" on initial mount.
    if (!seededRef.current) {
      for (const loc of locations) {
        lastRecordedRef.current.set(loc.asset_id, loc.recorded_at);
      }
      seededRef.current = true;
      return;
    }
    const changed: string[] = [];
    for (const loc of locations) {
      const prev = lastRecordedRef.current.get(loc.asset_id);
      if (prev !== undefined && prev !== loc.recorded_at) {
        changed.push(loc.asset_id);
      }
      lastRecordedRef.current.set(loc.asset_id, loc.recorded_at);
    }
    if (changed.length === 0) return;
    const toFlash = changed.slice(0, MAX_FLASHES_PER_REFRESH);
    setFlashing((prev) => {
      const next = new Set(prev);
      for (const id of toFlash) next.add(id);
      return next;
    });
    for (const id of toFlash) {
      const existing = flashTimersRef.current.get(id);
      if (existing) window.clearTimeout(existing);
      const t = window.setTimeout(() => {
        setFlashing((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        flashTimersRef.current.delete(id);
      }, FLASH_DURATION_MS);
      flashTimersRef.current.set(id, t);
    }
  }, [locations]);

  useEffect(
    () => () => {
      for (const t of flashTimersRef.current.values()) window.clearTimeout(t);
    },
    [],
  );

  const formatRelative = (iso: string): string => {
    const ts = new Date(iso).getTime();
    const diffMs = Date.now() - ts;
    if (diffMs < 0 || !Number.isFinite(diffMs)) return new Date(iso).toLocaleString();
    const sec = Math.floor(diffMs / 1000);
    if (sec < 5) return 'just now';
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}d ago`;
    return new Date(iso).toLocaleDateString();
  };

  const onCreate = async (values: AssetCreate) => {
    try {
      const created = await createAsset.mutateAsync(values);
      message.success(`Asset "${created.name}" created`);
      // Sprint 37 row 3.9d — flush the queued labels onto the new asset.
      // Partial-failure path leaves the user on the detail page where
      // <LabelChips/> can re-add the failed entries.
      if (pendingLabels.length > 0) {
        const { ok, failed } = await attachPendingLabels(
          'asset',
          created.id,
          pendingLabels,
        );
        if (ok > 0) message.success(`Attached ${ok} label${ok === 1 ? '' : 's'}`);
        for (const f of failed) {
          message.error(
            `Could not attach "${f.label.key}: ${f.label.value}" — ${
              f.error instanceof Error ? f.error.message : 'unknown error'
            }`,
          );
        }
      }
      setModalOpen(false);
      form.resetFields();
      setPendingLabels([]);
      navigate(`/assets/${created.id}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to create asset');
    }
  };

  // Sprint 55 — page now uses <ListPageShell>. Filter toolbar (search,
  // status, filter-drawer toggle, last-seen range, never-seen) goes in
  // the shell's `toolbar` slot; the Register Asset button goes in
  // `primaryAction`; the side FilterPanel goes in `aside`.
  // Sprint 62 — column visibility. Extract the column defs into a memo so the
  // device-local "Columns" chooser and the table share one server-visible set.
  const assetColumns = useMemo<AssetColumn[]>(
    () => [
      { title: 'Name', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
      // Sprint 41 Phase F7 — the legacy 'Type' column was removed here;
      // the Category column below is the sole classifier surface.
      // Sprint 37 row 3.3a — Category column. Renders the category
      // name (resolved from the categories cache to avoid N+1) with
      // a Tag coloured by category_type. Sortable by name.
      {
        title: 'Category',
        key: 'category',
        sorter: (a, b) => {
          const an = a.category_id ? categoryById.get(a.category_id)?.name ?? '' : '';
          const bn = b.category_id ? categoryById.get(b.category_id)?.name ?? '' : '';
          return an.localeCompare(bn);
        },
        render: (_: unknown, row: AssetResponse) => {
          if (!row.category_id) return <Typography.Text type="secondary">—</Typography.Text>;
          const c = categoryById.get(row.category_id);
          if (!c) return <Typography.Text type="secondary">{row.category_id.slice(0, 8)}…</Typography.Text>;
          const typeColor: Record<string, string> = {
            liquid_container: 'blue',
            reference_tag: 'purple',
            rti_container: 'cyan',
            object: 'gold',
          };
          return (
            <Tooltip title={`Type: ${c.category_type}`}>
              <Tag color={typeColor[c.category_type] ?? 'default'}>{c.name}</Tag>
            </Tooltip>
          );
        },
      },
      {
        title: 'External Ref',
        key: 'external_ref',
        dataIndex: 'external_ref',
        render: (v: string | null) => v ?? '—',
      },
      {
        title: 'Status',
        dataIndex: 'status',
        filters: STATUS_FILTERS,
        onFilter: (value, record) => record.status === value,
        render: (v: string) => <Tag color={STATUS_COLOR[v] ?? 'default'}>{v}</Tag>,
      },
      {
        title: 'Location',
        key: 'location',
        filters: SOURCE_FILTERS,
        onFilter: (value, record) => {
          const loc = locationByAssetId.get(record.id);
          if (value === '__none__') return !loc;
          return loc?.latest_position_source === value;
        },
        render: (_: unknown, row: AssetResponse) => {
          const loc = locationByAssetId.get(row.id);
          if (!loc) return <Typography.Text type="secondary">—</Typography.Text>;
          const coords = `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`;
          return (
            <Tooltip title={`${coords} · source: ${loc.latest_position_source}`}>
              <Space size={4}>
                <span style={{ fontFamily: 'monospace' }}>{coords}</span>
                <Tag>{loc.latest_position_source}</Tag>
              </Space>
            </Tooltip>
          );
        },
      },
      {
        title: 'Last seen',
        key: 'last_seen',
        sorter: (a, b) => {
          const la = locationByAssetId.get(a.id)?.recorded_at;
          const lb = locationByAssetId.get(b.id)?.recorded_at;
          return (la ? Date.parse(la) : 0) - (lb ? Date.parse(lb) : 0);
        },
        render: (_: unknown, row: AssetResponse) => {
          const loc = locationByAssetId.get(row.id);
          if (!loc) return <Typography.Text type="secondary">never</Typography.Text>;
          const isFlashing = flashing.has(row.id);
          return (
            <Tooltip title={new Date(loc.recorded_at).toLocaleString()}>
              <span
                key={loc.recorded_at}
                className={isFlashing ? 'tagpulse-cell-pop' : undefined}
              >
                {formatRelative(loc.recorded_at)}
              </span>
            </Tooltip>
          );
        },
      },
      {
        title: 'Registered',
        key: 'created_at',
        dataIndex: 'created_at',
        render: (v: string) => (
          <Tooltip title={new Date(v).toLocaleString()}>{formatRelative(v)}</Tooltip>
        ),
      },
      ...(showTemperature
        ? [
            {
              title: 'Temperature',
              key: 'temperature',
              render: (_: unknown, row: AssetResponse) => {
                const t = (row.latest_telemetry ?? []).find(
                  (m) => m.metric_name === 'temperature_c',
                );
                if (!t) return <Typography.Text type="secondary">—</Typography.Text>;
                return (
                  <Tooltip title={`as of ${new Date(t.timestamp).toLocaleString()}`}>
                    <span style={{ fontFamily: 'monospace' }}>
                      {t.metric_value.toFixed(1)} {t.unit ?? '°C'}
                    </span>
                  </Tooltip>
                );
              },
            },
          ]
        : []),
    ],
    [categoryById, locationByAssetId, flashing, showTemperature],
  );

  // Server-resolved visible columns (tenant/role config + Advanced toggle).
  const serverVisibleColumns = useMemo(
    () =>
      applyColumnConfig<AssetColumn>(assetColumns, columnConfig, {
        defaultAdvanced: DEFAULT_ADVANCED_COLUMNS,
        showAdvanced,
      }),
    [assetColumns, columnConfig, showAdvanced],
  );

  // Sprint 62 — the addressable columns the device-local "Columns" chooser can
  // toggle (the server-visible candidates; unaddressable columns are omitted).
  const chooserColumns = useMemo<ColumnChooserItem[]>(
    () =>
      serverVisibleColumns
        .map((c) => ({ key: columnKey(c as KeyedColumn), label: (c as { title?: ReactNode }).title }))
        .filter((c): c is ColumnChooserItem => c.key !== undefined),
    [serverVisibleColumns],
  );

  // Apply the device-local hides on top of the server floor, then the
  // config-driven default sort.
  const visibleColumns = useMemo(
    () =>
      applyDefaultSort(
        serverVisibleColumns.filter((c) => {
          const k = columnKey(c as KeyedColumn);
          return k === undefined || !colVis.hidden.has(k);
        }),
        tableConfig.defaultSort,
      ),
    [serverVisibleColumns, colVis.hidden, tableConfig.defaultSort],
  );

  const toolbar = (
    <Space wrap>
      <Input.Search
        placeholder="Search by name, external ref, or tag"
        allowClear
        onSearch={setSearch}
        style={{ width: 360 }}
      />
      <Select
        options={STATUS_OPTIONS}
        value={status}
        onChange={setStatus}
        style={{ width: 160 }}
      />
      <Button
        icon={<FilterOutlined />}
        onClick={() => setFiltersOpen((v) => !v)}
        type={filtersOpen ? 'primary' : 'default'}
        data-testid="asset-list-filters-toggle"
      >
        Filters
        {(categoryIds.length > 0 || !isEmptyLabelFilter(labelFilter)) && (
          <Tag color="blue" style={{ marginLeft: 8 }} data-testid="asset-list-filters-applied-count">
            {categoryIds.length + Object.keys(labelFilter).length}
          </Tag>
        )}
      </Button>
      <RangePicker
        showTime
        allowClear
        placeholder={['Last seen from', 'to']}
        value={lastSeenRange as [Dayjs, Dayjs] | null}
        onChange={(v) => {
          setLastSeenRange(v as [Dayjs | null, Dayjs | null] | null);
          if (v) setNeverSeenOnly(false);
        }}
        presets={LAST_SEEN_PRESETS}
        style={{ width: 360 }}
        disabled={neverSeenOnly}
      />
      <Checkbox
        checked={neverSeenOnly}
        onChange={(e) => {
          setNeverSeenOnly(e.target.checked);
          if (e.target.checked) setLastSeenRange(null);
        }}
      >
        Never seen
      </Checkbox>
      {hasAdvancedColumns(baseColumnKeys, columnConfig, DEFAULT_ADVANCED_COLUMNS) && (
        <Checkbox
          checked={showAdvanced}
          onChange={(e) => setShowAdvanced(e.target.checked)}
          data-testid="asset-list-advanced-columns-toggle"
        >
          Advanced columns
        </Checkbox>
      )}
      <ColumnChooser
        columns={chooserColumns}
        hidden={colVis.hidden}
        onToggle={colVis.setColumnVisible}
        onShowAll={colVis.showAll}
      />
    </Space>
  );

  return (
    <>
      <style>{`
        @keyframes tagpulse-row-flash {
          0%   { background-color: rgba(82, 196, 26, 0.28); }
          60%  { background-color: rgba(82, 196, 26, 0.14); }
          100% { background-color: transparent; }
        }
        .tagpulse-row-flash > td {
          animation: tagpulse-row-flash ${FLASH_DURATION_MS}ms ease-out;
        }
        @keyframes tagpulse-cell-pop {
          0%   { transform: scale(1); color: var(--color-success); font-weight: 600; }
          40%  { transform: scale(1.06); color: var(--color-success); font-weight: 600; }
          100% { transform: scale(1); color: inherit; font-weight: inherit; }
        }
        .tagpulse-cell-pop {
          display: inline-block;
          animation: tagpulse-cell-pop ${FLASH_DURATION_MS}ms ease-out;
          transform-origin: left center;
        }
        @media (prefers-reduced-motion: reduce) {
          .tagpulse-row-flash > td,
          .tagpulse-cell-pop { animation: none; }
        }
      `}</style>
      <ListPageShell
        title={assetsLabel}
        count={filteredRows.length}
        countTestId="asset-list-title-count"
        primaryAction={
          canEdit && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalOpen(true)}
            >
              Register Asset
            </Button>
          )
        }
        toolbar={toolbar}
        aside={
          filtersOpen ? (
            <FilterPanel
              entityType="asset"
              value={{ categoryIds, labelFilter }}
              onApply={({ categoryIds: nextIds, labelFilter: nextLabels }) => {
                setCategoryIds(nextIds);
                setLabelFilter(nextLabels);
              }}
              onClose={() => setFiltersOpen(false)}
              data-testid="asset-list-filter-panel"
            />
          ) : undefined
        }
      >
        <Table<AssetResponse>
          rowKey="id"
          loading={isLoading}
          dataSource={filteredRows}
          onRow={(row) => ({ onClick: () => navigate(`/assets/${row.id}`) })}
          rowClassName={(row) =>
            flashing.has(row.id) ? 'tagpulse-row-flash' : ''
          }
          pagination={{ pageSize: 25, showSizeChanger: false }}
          style={{ cursor: 'pointer' }}
          locale={{
            emptyText:
              search ||
              status ||
              categoryIds.length > 0 ||
              !isEmptyLabelFilter(labelFilter) ||
              lastSeenRange ||
              neverSeenOnly ? (
                <EmptyState
                  title="No assets match these filters"
                  description="Try clearing search, status, category, label, or last-seen filters."
                />
              ) : (
                <EmptyState
                  title="No assets yet"
                  description="Register your first asset to start tracking it."
                  action={
                    canEdit ? (
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => setModalOpen(true)}
                      >
                        Register Asset
                      </Button>
                    ) : undefined
                  }
                />
              ),
          }}
          columns={visibleColumns}
        />
      </ListPageShell>

      <Modal
        title="Register Asset"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createAsset.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onCreate}
          initialValues={{ status: AssetCreate.status.ACTIVE }}
        >
          <Form.Item label="Name" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          {/* Sprint 41 Phase F7 / Phase H — the 'Asset Type' input was
              dropped here; Category (below) is the sole classifier.
              Sprint 41 Phase H removed the field from `AssetCreate`. */}
          {/* Sprint 37 row 3.3a — Category picker on Create. Optional:
              assets.category_id is nullable backend-side, so blank is OK. */}
          <Form.Item
            label="Category"
            name="category_id"
            help="Optional. Pick from the curated catalog at /categories."
          >
            <CategorySelect placeholder="Select a category (optional)" data-testid="asset-create-category" />
          </Form.Item>
          <Form.Item label="External Ref" name="external_ref">
            <Input placeholder="ERP/WMS code" />
          </Form.Item>
          <Form.Item label="Status" name="status">
            <Select
              options={[
                { value: AssetCreate.status.ACTIVE, label: 'Active' },
                { value: AssetCreate.status.RETIRED, label: 'Retired' },
                { value: AssetCreate.status.LOST, label: 'Lost' },
              ]}
            />
          </Form.Item>
          {/* Sprint 37 row 3.9d — queue labels client-side; flushed
              after the Create response in onCreate(). */}
          <Form.Item
            label="Labels"
            help="Optional. Queued labels are attached after the asset is created."
          >
            <PendingLabelPicker
              entityType="asset"
              value={pendingLabels}
              onChange={setPendingLabels}
              disabled={createAsset.isPending}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
