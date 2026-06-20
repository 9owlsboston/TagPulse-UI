import { useEffect, useMemo, useState } from 'react';
import Table from 'antd/es/table';
import Tag from 'antd/es/tag';
import Input from 'antd/es/input';
import Select from 'antd/es/select';
import Space from 'antd/es/space';
import Button from 'antd/es/button';
import Modal from 'antd/es/modal';
import Alert from 'antd/es/alert';
import App from 'antd/es/app';
import { FilterOutlined, PlusOutlined, SwapOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDevices } from '@/hooks/useDevices';
import { useLabel } from '@/lib/uiConfig';
import { useAuth } from '@/lib/auth';
import { RoleGuard } from '@/components/RoleGuard';
import { useCanPerform } from '@/components/useCanPerform';
import { useUpdateZone, useZones } from '@/hooks/useAssets';
import { FilterPanel } from '@/components/FilterPanel';
import { ListPageShell } from '@/components/ListPageShell';
import { columnSearchFilter } from '@/components/ColumnSearchFilter';
import { EmptyState } from '@/components/EmptyState';
import { isEmptyLabelFilter, type LabelFilter } from '@/lib/labelFilter';
import type { DeviceResponse } from '@/types';

// Sprint 28 G5 — cap parallel bulk reassign per page (Sprint 27 C6 pattern).
const BULK_REASSIGN_MAX = 50;

const { Search } = Input;

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Decommissioned', value: 'decommissioned' },
];

// Sprint 54.4 — Dashboard "Devices online" tile click-through deep-links
// here with ?connection=online. We filter client-side because the devices
// endpoint doesn't expose connection_state as a query param.
const CONNECTION_OPTIONS = [
  { label: 'Any connection', value: '' },
  { label: 'Online', value: 'online' },
  { label: 'Offline', value: 'offline' },
];

const baseColumns: ColumnsType<DeviceResponse> = [
  {
    title: 'Name',
    dataIndex: 'name',
    sorter: (a, b) => a.name.localeCompare(b.name),
    ...columnSearchFilter<DeviceResponse>({ accessor: (r) => r.name }),
  },
  { title: 'Type', dataIndex: 'device_type' },
  {
    title: 'Status',
    dataIndex: 'status',
    render: (status: string) => (
      <Tag color={status === 'active' ? 'green' : 'default'}>{status}</Tag>
    ),
  },
  {
    title: 'Connection',
    dataIndex: 'connection_state',
    render: (state: string) => (
      <Tag color={state === 'online' ? 'green' : 'red'}>{state}</Tag>
    ),
  },
  {
    title: 'Last Seen',
    dataIndex: 'last_seen',
    render: (v: string | null) => (v ? new Date(v).toLocaleString() : '—'),
  },
];

const adminTokenColumn: ColumnsType<DeviceResponse>[number] = {
  title: 'Last Rotated',
  dataIndex: 'token_rotated_at',
  render: (v: string | null) =>
    v ? new Date(v).toLocaleString() : <span style={{ color: 'var(--color-text-muted)' }}>never</span>,
};

export function DeviceList() {
  const devicesLabel = useLabel('device', { plural: true });
  const navigate = useNavigate();
  const { role } = useAuth();
  const { message } = App.useApp();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(() => {
    const s = searchParams.get('status') ?? '';
    return ['active', 'decommissioned'].includes(s) ? s : '';
  });
  const [connection, setConnection] = useState(() => {
    const c = searchParams.get('connection') ?? '';
    return ['online', 'offline'].includes(c) ? c : '';
  });
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [targetZoneId, setTargetZoneId] = useState<string | null>(null);
  const [reassignBusy, setReassignBusy] = useState(false);
  // Sprint 37 row 3.9b — device label filter; Sprint 43 — relocated
  // into the side <FilterPanel/> (categories card hidden for devices).
  const [labelFilter, setLabelFilter] = useState<LabelFilter>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { data, isLoading } = useDevices({ status: status || undefined, labels: labelFilter });
  const { data: zones } = useZones();
  const updateZone = useUpdateZone();
  const canEdit = useCanPerform('editor');

  const columns: ColumnsType<DeviceResponse> =
    role === 'admin' ? [...baseColumns, adminTokenColumn] : baseColumns;

  // Re-read URL params if the user navigates between dashboard tiles without
  // a full reload (e.g. clicks "Devices online" → back → "Devices total").
  useEffect(() => {
    const s = searchParams.get('status') ?? '';
    if (['active', 'decommissioned', ''].includes(s)) setStatus(s);
    const c = searchParams.get('connection') ?? '';
    if (['online', 'offline', ''].includes(c)) setConnection(c);
  }, [searchParams]);

  const filtered = data?.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) &&
      (connection === '' || d.connection_state === connection),
  );

  const zoneOptions = useMemo(
    () =>
      (zones ?? []).map((z) => ({
        value: z.id,
        label: `${z.name} (${z.kind})`,
        disabled: z.kind !== 'reader_bound',
      })),
    [zones],
  );

  // Sprint 28 G5 — re-assign selected devices into the target zone by
  // editing zone.fixed_reader_ids on every affected zone (devices belong
  // to zones via that array, not via a device.zone_id column). For each
  // selected device id: remove it from any zone it currently appears in
  // and add it to the target zone, then PATCH each touched zone once.
  const onConfirmReassign = async () => {
    if (!targetZoneId || selectedIds.length === 0) return;
    if (selectedIds.length > BULK_REASSIGN_MAX) {
      message.error(`Select up to ${BULK_REASSIGN_MAX} devices per page.`);
      return;
    }
    const allZones = zones ?? [];
    const targetZone = allZones.find((z) => z.id === targetZoneId);
    if (!targetZone) {
      message.error('Target zone not found');
      return;
    }
    const selectedSet = new Set(selectedIds);
    type Patch = { id: string; fixed_reader_ids: string[] };
    const patches: Patch[] = [];

    for (const z of allZones) {
      if (z.id === targetZoneId) continue;
      if (z.kind !== 'reader_bound') continue;
      const current = z.fixed_reader_ids ?? [];
      const next = current.filter((id) => !selectedSet.has(id));
      if (next.length !== current.length) {
        patches.push({ id: z.id, fixed_reader_ids: next });
      }
    }
    const targetCurrent = targetZone.fixed_reader_ids ?? [];
    const merged = Array.from(new Set([...targetCurrent, ...selectedIds]));
    if (merged.length !== targetCurrent.length) {
      patches.push({ id: targetZone.id, fixed_reader_ids: merged });
    }

    if (patches.length === 0) {
      message.info('Selected devices are already assigned to that zone.');
      setReassignOpen(false);
      setSelectedIds([]);
      return;
    }

    setReassignBusy(true);
    const results = await Promise.allSettled(
      patches.map((p) =>
        updateZone.mutateAsync({ id: p.id, data: { fixed_reader_ids: p.fixed_reader_ids } }),
      ),
    );
    setReassignBusy(false);
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed === 0) {
      message.success(
        `Moved ${selectedIds.length} device(s) into "${targetZone.name}".`,
      );
      setReassignOpen(false);
      setSelectedIds([]);
      setTargetZoneId(null);
    } else {
      message.error(
        `Reassign partially failed: ${failed} of ${patches.length} zone update(s) errored. Refresh and retry.`,
      );
    }
  };

  return (
    <>
      <ListPageShell
        title={devicesLabel}
        primaryAction={
          <RoleGuard roles={['admin', 'editor']}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/devices/register')}>
              Register Device
            </Button>
          </RoleGuard>
        }
        toolbar={
          <Space wrap>
            <Search placeholder="Search devices" onSearch={setSearch} allowClear style={{ width: 250 }} />
            <Select options={STATUS_OPTIONS} value={status} onChange={setStatus} style={{ width: 160 }} />
            <Select
              options={CONNECTION_OPTIONS}
              value={connection}
              onChange={setConnection}
              style={{ width: 160 }}
              data-testid="device-list-connection-filter"
            />
            {canEdit && (
              <Button
                icon={<SwapOutlined />}
                disabled={selectedIds.length === 0}
                onClick={() => setReassignOpen(true)}
              >
                Move to zone… ({selectedIds.length})
              </Button>
            )}
            <Button
              icon={<FilterOutlined />}
              onClick={() => setFiltersOpen((v) => !v)}
              type={filtersOpen ? 'primary' : 'default'}
              data-testid="device-list-filters-toggle"
            >
              Filters
              {!isEmptyLabelFilter(labelFilter) && (
                <Tag color="blue" style={{ marginLeft: 8 }} data-testid="device-list-filters-applied-count">
                  {Object.keys(labelFilter).length}
                </Tag>
              )}
            </Button>
          </Space>
        }
        aside={
          filtersOpen ? (
            <FilterPanel
              entityType="device"
              showCategories={false}
              value={{ categoryIds: [], labelFilter }}
              onApply={({ labelFilter: nextLabels }) => {
                setLabelFilter(nextLabels);
              }}
              onClose={() => setFiltersOpen(false)}
              data-testid="device-list-filter-panel"
            />
          ) : undefined
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filtered}
          loading={isLoading}
          pagination={{ defaultPageSize: 20, showSizeChanger: true, pageSizeOptions: [20, 50, 100] }}
          locale={{
            emptyText:
              search || status || connection || !isEmptyLabelFilter(labelFilter) ? (
                <EmptyState
                  title="No devices match these filters"
                  description="Try clearing search, status, connection, or label filters."
                />
              ) : (
                <EmptyState
                  title="No devices yet"
                  description="Register your first device to start collecting reads."
                  action={
                    <RoleGuard roles={['admin', 'editor']}>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => navigate('/devices/register')}
                      >
                        Register Device
                      </Button>
                    </RoleGuard>
                  }
                />
              ),
          }}
          rowSelection={
            canEdit
              ? {
                  selectedRowKeys: selectedIds,
                  onChange: (keys) => setSelectedIds(keys as string[]),
                  preserveSelectedRowKeys: false,
                }
              : undefined
          }
          onRow={(record) => ({
            onClick: (e) => {
              // Don't navigate when the click is on the checkbox.
              const target = e.target as HTMLElement;
              if (target.closest('.ant-table-selection-column')) return;
              navigate(`/devices/${record.id}`);
            },
          })}
          style={{ cursor: 'pointer' }}
        />
      </ListPageShell>

      {/* Sprint 28 G5 — bulk reassign modal. */}
      <Modal
        open={reassignOpen}
        title="Move devices to zone"
        onCancel={() => setReassignOpen(false)}
        onOk={onConfirmReassign}
        confirmLoading={reassignBusy}
        okButtonProps={{ disabled: !targetZoneId }}
        okText={`Move ${selectedIds.length} device(s)`}
        destroyOnHidden
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message={`Selected devices will be removed from their current reader-bound zones and added to the target zone. Limited to ${BULK_REASSIGN_MAX} per page.`}
        />
        <Select
          style={{ width: '100%' }}
          placeholder="Select target zone (reader-bound only)"
          options={zoneOptions}
          value={targetZoneId ?? undefined}
          onChange={(v) => setTargetZoneId(v)}
          showSearch
          optionFilterProp="label"
        />
      </Modal>
    </>
  );
}
