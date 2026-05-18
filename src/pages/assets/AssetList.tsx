import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from 'antd/es/button';
import Card from 'antd/es/card';
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
import { PlusOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { useAssets, useAssetsCurrentLocations, useCreateAsset } from '@/hooks/useAssets';
import { useCategories } from '@/hooks/useCategories';
import { useCanPerform } from '@/components/useCanPerform';
import { useTenantConfig } from '@/hooks/useTenantConfig';
import { CategorySelect } from '@/components/CategorySelect';
import type { AssetResponse } from '@/api/generated/models/AssetResponse';
import type { AssetCurrentLocation } from '@/api/generated/models/AssetCurrentLocation';
import { AssetCreate } from '@/api/generated/models/AssetCreate';

const { Title } = Typography;
const { RangePicker } = DatePicker;

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
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  // Sprint 37 row 3.3a — list-page Category filter. Backend GET /assets
  // doesn't expose a category_id query param today, so this is client-side
  // narrowing on the current page (parity with the last-seen RangePicker
  // + the never-seen Checkbox above). Backend filter is tracked as a
  // follow-up row in docs/design/reference-design-remediation.md.
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [lastSeenRange, setLastSeenRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [neverSeenOnly, setNeverSeenOnly] = useState(false);
  const { data, isLoading } = useAssets({
    q: search || undefined,
    status: status || undefined,
  });
  const { data: locations } = useAssetsCurrentLocations();
  const { data: tenant } = useTenantConfig();
  const showTemperature = (tenant?.telemetry_subject_kinds ?? []).includes('asset');
  const createAsset = useCreateAsset();
  const canEdit = useCanPerform('editor');
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

  const rows = useMemo(() => data ?? [], [data]);
  const locationByAssetId = useMemo(() => {
    const map = new Map<string, AssetCurrentLocation>();
    for (const loc of locations ?? []) {
      map.set(loc.asset_id, loc);
    }
    return map;
  }, [locations]);

  // Asset-type column-header filter, auto-derived from current page.
  const typeFilters = useMemo(() => {
    const seen = new Set<string>();
    for (const r of rows) if (r.asset_type) seen.add(r.asset_type);
    return Array.from(seen)
      .sort()
      .map((v) => ({ text: v, value: v }));
  }, [rows]);

  // Client-side narrow on top of the server-fetched page: applies the
  // last-seen range, the "never seen" toggle, and the Category filter.
  const filteredRows = useMemo(() => {
    const from = lastSeenRange?.[0]?.valueOf();
    const to = lastSeenRange?.[1]?.valueOf();
    return rows.filter((r) => {
      if (categoryId && r.category_id !== categoryId) return false;
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
  }, [rows, locationByAssetId, lastSeenRange, neverSeenOnly, categoryId]);

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
      setModalOpen(false);
      form.resetFields();
      navigate(`/assets/${created.id}`);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to create asset');
    }
  };

  return (
    <div>
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
          0%   { transform: scale(1); color: #389e0d; font-weight: 600; }
          40%  { transform: scale(1.06); color: #389e0d; font-weight: 600; }
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
      <Title level={2}>Assets</Title>
      <Card>
        <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }} wrap>
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
            {/* Sprint 37 row 3.3a — list-page Category filter. */}
            <CategorySelect
              value={categoryId}
              onChange={setCategoryId}
              placeholder="Filter by category"
              style={{ width: 220 }}
              data-testid="asset-list-category-filter"
            />
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
            <Typography.Text type="secondary">
              {filteredRows.length} of {rows.length}
            </Typography.Text>
          </Space>
          {canEdit && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalOpen(true)}
            >
              Register Asset
            </Button>
          )}
        </Space>
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
          columns={[
            { title: 'Name', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
            {
              title: 'Type',
              dataIndex: 'asset_type',
              filters: typeFilters.length > 0 ? typeFilters : undefined,
              onFilter: (value, record) => record.asset_type === value,
            },
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
          ]}
        />
      </Card>

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
          initialValues={{ status: AssetCreate.status.ACTIVE, asset_type: 'pallet' }}
        >
          <Form.Item label="Name" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Asset Type" name="asset_type" rules={[{ required: true }]}>
            <Input placeholder="pallet, tool, container, …" />
          </Form.Item>
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
        </Form>
      </Modal>
    </div>
  );
}
