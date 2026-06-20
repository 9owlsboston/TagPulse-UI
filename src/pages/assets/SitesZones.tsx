import { useMemo, useState } from 'react';
import Button from 'antd/es/button';
import Card from 'antd/es/card';
import Col from 'antd/es/col';
import Collapse from 'antd/es/collapse';
import Form from 'antd/es/form';
import Input from 'antd/es/input';
import InputNumber from 'antd/es/input-number';
import Modal from 'antd/es/modal';
import Row from 'antd/es/row';
import Select from 'antd/es/select';
import Space from 'antd/es/space';
import Table from 'antd/es/table';
import Tabs from 'antd/es/tabs';
import Tag from 'antd/es/tag';
import Typography from 'antd/es/typography';
import App from 'antd/es/app';
import {
  CarOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  FilterOutlined,
  PlusOutlined,
  BorderOuterOutlined,
} from '@ant-design/icons';
import {
  useAssetsInZone,
  useCreateSite,
  useCreateZone,
  useDeleteSite,
  useDeleteZone,
  useSites,
  useUpdateSite,
  useUpdateZone,
  useZones,
} from '@/hooks/useAssets';
import { useDevices } from '@/hooks/useDevices';
import { useCanPerform } from '@/components/useCanPerform';
import { RoleGuard } from '@/components/RoleGuard';
import { LabelChips } from '@/components/LabelChips';
import {
  PendingLabelPicker,
  attachPendingLabels,
  type PendingLabel,
} from '@/components/PendingLabelPicker';
import { FilterPanel } from '@/components/FilterPanel';
import { useThemeMode } from '@/theme/ThemeProvider';
import { tokens } from '@/theme/tokens';
import { isEmptyLabelFilter, type LabelFilter } from '@/lib/labelFilter';
import { useLabel } from '@/lib/uiConfig';
import type { ZoneResponse } from '@/api/generated/models/ZoneResponse';
import type { SiteResponse } from '@/api/generated/models/SiteResponse';
import { columnSearchFilter } from '@/components/ColumnSearchFilter';
import { ZoneCreate } from '@/api/generated/models/ZoneCreate';
import { SiteCreate } from '@/api/generated/models/SiteCreate';
import type { SiteUpdate } from '@/api/generated/models/SiteUpdate';
import type { ZoneUpdate } from '@/api/generated/models/ZoneUpdate';
import { PolygonDraw } from '@/components/PolygonDraw';
import { FloorPlanModal } from '@/components/floor/FloorPlanModal';

const { Title, Text } = Typography;

export function SitesZones() {
  const { mode } = useThemeMode();
  const devicesLabel = useLabel('device', { plural: true });
  const zoneLabel = useLabel('zone');
  const t = tokens[mode];
  const { modal, message } = App.useApp();
  // Sprint 37 row 3.9b — site + zone label filters; Sprint 43 — moved
  // into two stacked side <FilterPanel/>s under a single Filters toggle
  // (categories card hidden for site/zone entity types).
  const [siteLabelFilter, setSiteLabelFilter] = useState<LabelFilter>({});
  const [zoneLabelFilter, setZoneLabelFilter] = useState<LabelFilter>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { data: sites, isLoading: sitesLoading } = useSites({ labels: siteLabelFilter });
  const { data: zones, isLoading: zonesLoading } = useZones({ labels: zoneLabelFilter });
  const { data: devices } = useDevices();
  const createSite = useCreateSite();
  const createZone = useCreateZone();
  const updateSite = useUpdateSite();
  const updateZone = useUpdateZone();
  const deleteSite = useDeleteSite();
  const deleteZone = useDeleteZone();
  const isAdmin = useCanPerform('admin');

  // Sprint 34 gap 3.2 — two-tab Sites / Transporters. The create modal
  // shares one form; the kind is pre-set from whichever tab opened it.
  const [activeTab, setActiveTab] = useState<'site' | 'transporter'>('site');
  const [creatingKind, setCreatingKind] = useState<'site' | 'transporter' | null>(null);
  const [zoneModalSiteId, setZoneModalSiteId] = useState<string | null>(null);
  const [editingSite, setEditingSite] = useState<SiteResponse | null>(null);
  const [floorPlanSiteId, setFloorPlanSiteId] = useState<string | null>(null);
  const [editingZone, setEditingZone] = useState<ZoneResponse | null>(null);
  const [occupantsZone, setOccupantsZone] = useState<ZoneResponse | null>(null);
  // Sprint 37 row 3.9d — client-side label queues for the Site and Zone
  // Create modals. Flushed via attachPendingLabels() after the entity_id
  // is known. Cleared on modal close.
  const [pendingSiteLabels, setPendingSiteLabels] = useState<PendingLabel[]>([]);
  const [pendingZoneLabels, setPendingZoneLabels] = useState<PendingLabel[]>([]);
  const [siteForm] = Form.useForm<SiteCreate>();
  const [zoneForm] = Form.useForm<ZoneCreate>();
  const [editSiteForm] = Form.useForm<SiteUpdate>();
  const [editZoneForm] = Form.useForm<ZoneUpdate>();
  const zoneKind = Form.useWatch('kind', zoneForm);

  const sitesByKind = useMemo(() => {
    const buckets: Record<'site' | 'transporter', SiteResponse[]> = {
      site: [],
      transporter: [],
    };
    for (const s of sites ?? []) {
      const k = s.kind === 'transporter' ? 'transporter' : 'site';
      buckets[k].push(s);
    }
    return buckets;
  }, [sites]);

  const deviceOptions = useMemo(
    () =>
      (devices ?? []).map((d) => ({
        value: d.id,
        label: `${d.name} (${d.device_type})`,
      })),
    [devices],
  );
  const deviceById = useMemo(
    () => new Map((devices ?? []).map((d) => [d.id, d])),
    [devices],
  );

  /** Coerce empty form values + paired-lat-lon check before calling the API. */
  const normalizeSitePayload = <T extends SiteCreate | SiteUpdate>(values: T): T => {
    // Strip empty strings to undefined so we don't send "" to the server
    // for optional fields. AntD's `Input` returns "" when cleared, but the
    // backend treats "" and missing as the same thing.
    const out = { ...values } as Record<string, unknown>;
    const blankToUndefined = [
      'address',
      'street_line1',
      'street_line2',
      'city',
      'region',
      'postal_code',
      'country',
    ];
    for (const k of blankToUndefined) {
      if (out[k] === '' || out[k] === null) out[k] = undefined;
    }
    if (typeof out.country === 'string') out.country = out.country.toUpperCase();
    return out as T;
  };

  /**
   * The DB CHECK constraint requires `(lat IS NULL) = (lon IS NULL)` — i.e.
   * either both are set or neither is. Surface that as a form-level error
   * before the request hits the server.
   */
  const validateLatLonPaired = (values: { latitude?: number | null; longitude?: number | null }) => {
    const hasLat = values.latitude !== undefined && values.latitude !== null;
    const hasLon = values.longitude !== undefined && values.longitude !== null;
    if (hasLat !== hasLon) {
      message.error('Latitude and longitude must both be provided, or both be empty.');
      return false;
    }
    return true;
  };

  const onCreateSite = async (values: SiteCreate) => {
    if (!validateLatLonPaired(values)) return;
    try {
      const payload = normalizeSitePayload<SiteCreate>({
        ...values,
        kind:
          creatingKind === 'transporter'
            ? SiteCreate.kind.TRANSPORTER
            : SiteCreate.kind.SITE,
      });
      const created = await createSite.mutateAsync(payload);
      const label = payload.kind === SiteCreate.kind.TRANSPORTER ? 'Transporter' : 'Site';
      message.success(`${label} "${values.name}" created`);
      // Sprint 37 row 3.9d — flush queued labels onto the new site.
      if (pendingSiteLabels.length > 0) {
        const { ok, failed } = await attachPendingLabels(
          'site',
          created.id,
          pendingSiteLabels,
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
      setCreatingKind(null);
      siteForm.resetFields();
      setPendingSiteLabels([]);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to create site');
    }
  };

  const onCreateZone = async (values: ZoneCreate) => {
    try {
      const created = await createZone.mutateAsync({
        ...values,
        site_id: zoneModalSiteId!,
      });
      message.success(`Zone "${values.name}" created`);
      // Sprint 37 row 3.9d — flush queued labels onto the new zone.
      if (pendingZoneLabels.length > 0) {
        const { ok, failed } = await attachPendingLabels(
          'zone',
          created.id,
          pendingZoneLabels,
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
      setZoneModalSiteId(null);
      zoneForm.resetFields();
      setPendingZoneLabels([]);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to create zone');
    }
  };

  const handleDeleteSite = (site: SiteResponse) => {
    const label = site.kind === 'transporter' ? 'transporter' : 'site';
    modal.confirm({
      title: `Delete ${label}`,
      content: `Delete "${site.name}"? Its zones will be deleted too.`,
      okType: 'danger',
      onOk: () => deleteSite.mutateAsync(site.id),
    });
  };

  const handleDeleteZone = (zone: ZoneResponse) => {
    modal.confirm({
      title: `Delete ${zoneLabel}`,
      content: `Delete zone "${zone.name}"?`,
      okType: 'danger',
      onOk: () => deleteZone.mutateAsync(zone.id),
    });
  };

  // Sprint 28 G3 — edit handlers; Sprint 34 gap 3.2 — extended with
  // kind, structured-address fields, and lat/lon.
  const openEditSite = (site: SiteResponse) => {
    editSiteForm.setFieldsValue({
      name: site.name,
      kind: site.kind,
      address: site.address ?? null,
      street_line1: site.street_line1 ?? null,
      street_line2: site.street_line2 ?? null,
      city: site.city ?? null,
      region: site.region ?? null,
      postal_code: site.postal_code ?? null,
      country: site.country ?? null,
      latitude: site.latitude ?? null,
      longitude: site.longitude ?? null,
      default_timezone: site.default_timezone,
    });
    setEditingSite(site);
  };

  const onEditSite = async (values: SiteUpdate) => {
    if (!editingSite) return;
    if (!validateLatLonPaired(values)) return;
    try {
      const payload = normalizeSitePayload<SiteUpdate>(values);
      await updateSite.mutateAsync({ id: editingSite.id, data: payload });
      message.success(`Site "${values.name ?? editingSite.name}" updated`);
      setEditingSite(null);
      editSiteForm.resetFields();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to update site');
    }
  };

  const openEditZone = (zone: ZoneResponse) => {
    editZoneForm.setFieldsValue({
      name: zone.name,
      fixed_reader_ids: zone.fixed_reader_ids ?? undefined,
    });
    setEditingZone(zone);
  };

  const onEditZone = async (values: ZoneUpdate) => {
    if (!editingZone) return;
    try {
      await updateZone.mutateAsync({ id: editingZone.id, data: values });
      message.success(`Zone "${values.name ?? editingZone.name}" updated`);
      setEditingZone(null);
      editZoneForm.resetFields();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to update zone');
    }
  };

  /**
   * Render the per-tab Collapse list. Pulled out so both tabs share the
   * exact same row layout (icon + name + zones table + admin actions).
   */
  const renderSitesCollapse = (subset: SiteResponse[], emptyText: string) => {
    if (subset.length === 0) {
      return <Text type="secondary">{emptyText}</Text>;
    }
    return (
      <Collapse
        defaultActiveKey={subset.map((s) => s.id)}
        items={subset.map((site) => {
          const siteZones = (zones ?? []).filter((z) => z.site_id === site.id);
          const isTransporter = site.kind === 'transporter';
          const KindIcon = isTransporter ? CarOutlined : EnvironmentOutlined;
          return {
            key: site.id,
            label: (
              <Space>
                <KindIcon
                  style={{ color: isTransporter ? t.colorWarning : t.colorAccent }}
                  aria-label={isTransporter ? 'transporter' : 'site'}
                />
                <strong>{site.name}</strong>
                <Text type="secondary">{formatSiteAddress(site)}</Text>
                <Tag>{site.default_timezone}</Tag>
                <Tag color="blue">{siteZones.length} zone(s)</Tag>
              </Space>
            ),
            extra: isAdmin ? (
              <Space onClick={(e) => e.stopPropagation()}>
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setZoneModalSiteId(site.id)}
                >
                  Add Zone
                </Button>
                {!isTransporter && (
                  <Button
                    size="small"
                    icon={<BorderOuterOutlined />}
                    onClick={() => setFloorPlanSiteId(site.id)}
                    aria-label={`Floor plan for site ${site.name}`}
                  >
                    Floor plan
                  </Button>
                )}
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => openEditSite(site)}
                  aria-label={`Edit ${isTransporter ? 'transporter' : 'site'} ${site.name}`}
                />
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteSite(site)}
                  aria-label={`Delete ${isTransporter ? 'transporter' : 'site'} ${site.name}`}
                />
              </Space>
            ) : null,
            children: (
              <Table<ZoneResponse>
                rowKey="id"
                dataSource={siteZones}
                pagination={false}
                size="small"
                locale={{ emptyText: 'No zones in this site yet.' }}
                columns={[
                  {
                    title: 'Name',
                    dataIndex: 'name',
                    ...columnSearchFilter<ZoneResponse>({ accessor: (r) => r.name }),
                  },
                  {
                    title: 'Kind',
                    dataIndex: 'kind',
                    width: 130,
                    render: (v: string) => <Tag>{v}</Tag>,
                  },
                  {
                    title: devicesLabel,
                    dataIndex: 'fixed_reader_ids',
                    render: (ids: string[] | null) =>
                      ids && ids.length > 0 ? (
                        <Space size={[4, 4]} wrap>
                          {ids.map((id) => (
                            <Tag key={id}>
                              {deviceById.get(id)?.name ?? id.slice(0, 8)}
                            </Tag>
                          ))}
                        </Space>
                      ) : (
                        <Text type="secondary">—</Text>
                      ),
                  },
                  {
                    title: '',
                    width: 200,
                    render: (_, row) => (
                      <Space>
                        <Button
                          size="small"
                          onClick={() => setOccupantsZone(row)}
                        >
                          Occupants
                        </Button>
                        {isAdmin ? (
                          <>
                            <Button
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => openEditZone(row)}
                              aria-label={`Edit zone ${row.name}`}
                            />
                            <Button
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => handleDeleteZone(row)}
                            />
                          </>
                        ) : null}
                      </Space>
                    ),
                  },
                ]}
              />
            ),
          };
        })}
      />
    );
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
        <Title level={2} style={{ margin: 0 }}>Locations</Title>
        <Space>
          <Button
            icon={<FilterOutlined />}
            onClick={() => setFiltersOpen((v) => !v)}
            type={filtersOpen ? 'primary' : 'default'}
            data-testid="sites-zones-filters-toggle"
          >
            Filters
            {(!isEmptyLabelFilter(siteLabelFilter) || !isEmptyLabelFilter(zoneLabelFilter)) && (
              <Tag
                color="blue"
                style={{ marginLeft: 8 }}
                data-testid="sites-zones-filters-applied-count"
              >
                {Object.keys(siteLabelFilter).length + Object.keys(zoneLabelFilter).length}
              </Tag>
            )}
          </Button>
          <RoleGuard roles={['admin']}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreatingKind(activeTab)}
            >
              New {activeTab === 'transporter' ? 'Transporter' : 'Site'}
            </Button>
          </RoleGuard>
        </Space>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Card loading={sitesLoading || zonesLoading}>
            <Tabs
              activeKey={activeTab}
              onChange={(k) => setActiveTab(k as 'site' | 'transporter')}
              items={[
                {
                  key: 'site',
                  label: (
                    <Space>
                      <EnvironmentOutlined />
                      Sites
                      <Tag>{sitesByKind.site.length}</Tag>
                    </Space>
                  ),
                  children: renderSitesCollapse(
                    sitesByKind.site,
                    'No sites yet. Create one to start defining zones.',
                  ),
                },
                {
                  key: 'transporter',
                  label: (
                    <Space>
                      <CarOutlined />
                      Transporters
                      <Tag>{sitesByKind.transporter.length}</Tag>
                    </Space>
                  ),
                  children: renderSitesCollapse(
                    sitesByKind.transporter,
                    'No transporters yet. Create one to track a mobile container, truck, or trailer.',
                  ),
                },
              ]}
            />
          </Card>
        </div>
        {filtersOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <FilterPanel
              entityType="site"
              showCategories={false}
              value={{ categoryIds: [], labelFilter: siteLabelFilter }}
              onApply={({ labelFilter: nextLabels }) => {
                setSiteLabelFilter(nextLabels);
              }}
              onClose={() => setFiltersOpen(false)}
              data-testid="sites-zones-site-filter-panel"
            />
            <FilterPanel
              entityType="zone"
              showCategories={false}
              value={{ categoryIds: [], labelFilter: zoneLabelFilter }}
              onApply={({ labelFilter: nextLabels }) => {
                setZoneLabelFilter(nextLabels);
              }}
              onClose={() => setFiltersOpen(false)}
              data-testid="sites-zones-zone-filter-panel"
            />
          </div>
        )}
      </div>

      <Modal
        title={creatingKind === 'transporter' ? 'Create Transporter' : 'Create Site'}
        open={creatingKind !== null}
        onCancel={() => {
          setCreatingKind(null);
          siteForm.resetFields();
        }}
        onOk={() => siteForm.submit()}
        confirmLoading={createSite.isPending}
        width={680}
        destroyOnHidden
      >
        <Form
          form={siteForm}
          layout="vertical"
          onFinish={onCreateSite}
          initialValues={{
            default_timezone: 'UTC',
            kind: creatingKind ?? SiteCreate.kind.SITE,
          }}
        >
          <Form.Item label="Name" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            label="Kind"
            name="kind"
            help="Sites are fixed locations; transporters are mobile (truck, trailer, container)."
          >
            <Select
              options={[
                { value: SiteCreate.kind.SITE, label: 'Site (fixed location)' },
                { value: SiteCreate.kind.TRANSPORTER, label: 'Transporter (mobile)' },
              ]}
            />
          </Form.Item>
          <Form.Item label="Default Timezone" name="default_timezone">
            <Input placeholder="e.g. UTC, America/Los_Angeles" />
          </Form.Item>
          <SiteAddressFields />
          {/* Sprint 37 row 3.9d — queued labels flushed after create. */}
          <Form.Item
            label="Labels"
            help="Optional. Queued labels are attached after the site is created."
          >
            <PendingLabelPicker
              entityType="site"
              value={pendingSiteLabels}
              onChange={setPendingSiteLabels}
              disabled={createSite.isPending}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Create Zone"
        open={zoneModalSiteId !== null}
        onCancel={() => setZoneModalSiteId(null)}
        onOk={() => zoneForm.submit()}
        confirmLoading={createZone.isPending}
      >
        <Form
          form={zoneForm}
          layout="vertical"
          onFinish={onCreateZone}
          initialValues={{ kind: ZoneCreate.kind.READER_BOUND }}
        >
          <Form.Item label="Name" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Kind" name="kind">
            <Select
              options={[
                { value: ZoneCreate.kind.READER_BOUND, label: 'Reader-bound' },
                { value: ZoneCreate.kind.GEOFENCE, label: 'Geofence (Sprint 17a)' },
              ]}
            />
          </Form.Item>
          <Form.Item label="Readers" name="fixed_reader_ids">
            <Select
              mode="multiple"
              placeholder="Pick one or more readers from the device registry"
              options={deviceOptions}
              optionFilterProp="label"
              showSearch
              disabled={zoneKind === ZoneCreate.kind.GEOFENCE}
            />
          </Form.Item>
          {zoneKind === ZoneCreate.kind.GEOFENCE && (
            <Form.Item
              label="Polygon"
              name="polygon_geojson"
              rules={[{ required: true, message: 'Draw a polygon (at least 3 vertices)' }]}
            >
              <PolygonDraw />
            </Form.Item>
          )}
          {/* Sprint 37 row 3.9d — queued labels flushed after create. */}
          <Form.Item
            label="Labels"
            help="Optional. Queued labels are attached after the zone is created."
          >
            <PendingLabelPicker
              entityType="zone"
              value={pendingZoneLabels}
              onChange={setPendingZoneLabels}
              disabled={createZone.isPending}
            />
          </Form.Item>
        </Form>
      </Modal>

      <ZoneOccupantsModal
        zone={occupantsZone}
        onClose={() => setOccupantsZone(null)}
      />

      <FloorPlanModal
        site={(sites ?? []).find((s) => s.id === floorPlanSiteId) ?? null}
        devices={devices ?? []}
        open={floorPlanSiteId !== null}
        onClose={() => setFloorPlanSiteId(null)}
      />

      {/* Sprint 28 G3 — edit modal. Sprint 34 gap 3.2 — extended with kind,
          structured-address fields, and lat/lon. */}
      <Modal
        title={
          editingSite
            ? `Edit ${editingSite.kind === 'transporter' ? 'Transporter' : 'Site'} — ${editingSite.name}`
            : 'Edit'
        }
        open={editingSite !== null}
        onCancel={() => {
          setEditingSite(null);
          editSiteForm.resetFields();
        }}
        onOk={() => editSiteForm.submit()}
        confirmLoading={updateSite.isPending}
        width={680}
        destroyOnHidden
      >
        <Form form={editSiteForm} layout="vertical" onFinish={onEditSite}>
          <Form.Item label="Name" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            label="Kind"
            name="kind"
            help="Mutable — reclassify a transporter that becomes permanently parked, or vice-versa."
          >
            <Select
              options={[
                { value: 'site', label: 'Site (fixed location)' },
                { value: 'transporter', label: 'Transporter (mobile)' },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="Default Timezone"
            name="default_timezone"
            help="IANA TZ database name (e.g. UTC, America/New_York, Europe/Berlin)."
          >
            <Input placeholder="e.g. UTC, America/Los_Angeles" />
          </Form.Item>
          <SiteAddressFields />
        </Form>
        {/* Sprint 37 row 3.9a — labels chips. Sits below the edit form
            inside the same modal so the existing entity's labels are
            attachable/detachable from the same surface used to edit it. */}
        {editingSite && (
          <div style={{ marginTop: 16 }}>
            <LabelChips entityType="site" entityId={editingSite.id} />
          </div>
        )}
      </Modal>

      {/* Sprint 28 G3 — edit zone modal. Polygon edit deferred per roadmap. */}
      <Modal
        title={editingZone ? `Edit Zone — ${editingZone.name}` : 'Edit Zone'}
        open={editingZone !== null}
        onCancel={() => {
          setEditingZone(null);
          editZoneForm.resetFields();
        }}
        onOk={() => editZoneForm.submit()}
        confirmLoading={updateZone.isPending}
        destroyOnHidden
      >
        <Form form={editZoneForm} layout="vertical" onFinish={onEditZone}>
          <Form.Item label="Name" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            label="Kind"
            help="Zone kind is immutable. To change kind, delete and recreate."
          >
            <Input value={editingZone?.kind ?? ''} disabled />
          </Form.Item>
          {editingZone?.kind === 'reader_bound' && (
            <Form.Item label="Readers" name="fixed_reader_ids">
              <Select
                mode="multiple"
                placeholder="Pick one or more readers from the device registry"
                options={deviceOptions}
                optionFilterProp="label"
                showSearch
                allowClear
              />
            </Form.Item>
          )}
          {editingZone?.kind === 'geofence' && (
            <Text type="secondary">
              Polygon edits are deferred to the Map page in a later sprint.
            </Text>
          )}
        </Form>
        {/* Sprint 37 row 3.9a — labels chips. Same pattern as the Site
            edit modal — chips live below the form so the existing zone's
            labels are managed from the same surface used to edit it. */}
        {editingZone && (
          <div style={{ marginTop: 16 }}>
            <LabelChips entityType="zone" entityId={editingZone.id} />
          </div>
        )}
      </Modal>
    </div>
  );
}

/**
 * Format a one-line address summary for the Collapse panel header.
 * Prefers structured fields (city, region, country) and falls back to the
 * legacy free-form `address` field, then to an em-dash.
 */
function formatSiteAddress(site: SiteResponse): string {
  const parts = [site.city, site.region, site.country].filter(
    (v): v is string => Boolean(v),
  );
  if (parts.length > 0) return parts.join(', ');
  return site.address ?? '—';
}

/**
 * Shared structured-address + geolocation form section. Both the create
 * and edit Site modals embed this so the field shapes stay aligned with
 * the backend `SiteCreate` / `SiteUpdate` schemas.
 *
 * `country` is a 2-letter ISO-3166-1 alpha-2 code (uppercased on submit
 * via `normalizeSitePayload`). `latitude` / `longitude` must be supplied
 * as a pair (validated in `validateLatLonPaired`).
 */
function SiteAddressFields() {
  return (
    <>
      <Form.Item label="Street line 1" name="street_line1">
        <Input maxLength={200} />
      </Form.Item>
      <Form.Item label="Street line 2" name="street_line2">
        <Input maxLength={200} />
      </Form.Item>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item label="City" name="city">
            <Input maxLength={100} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Region / state / province" name="region">
            <Input maxLength={100} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item label="Postal code" name="postal_code">
            <Input maxLength={20} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="Country"
            name="country"
            help="ISO-3166-1 alpha-2 (e.g. US, GB, DE)."
            normalize={(v: string | undefined) => (v ? v.toUpperCase() : v)}
          >
            <Input maxLength={2} placeholder="US" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={12}>
        <Col span={12}>
          <Form.Item label="Latitude" name="latitude" help="−90 to 90 (decimal degrees).">
            <InputNumber
              min={-90}
              max={90}
              step={0.0001}
              style={{ width: '100%' }}
              placeholder="e.g. 47.6062"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Longitude" name="longitude" help="−180 to 180 (decimal degrees).">
            <InputNumber
              min={-180}
              max={180}
              step={0.0001}
              style={{ width: '100%' }}
              placeholder="e.g. -122.3321"
            />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item label="Notes (free-form address)" name="address">
        <Input.TextArea rows={2} />
      </Form.Item>
    </>
  );
}

function ZoneOccupantsModal({
  zone,
  onClose,
}: {
  zone: ZoneResponse | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useAssetsInZone(zone?.id);
  const tagLabel = useLabel('tag');
  return (
    <Modal
      title={zone ? `Assets in "${zone.name}"` : 'Assets in zone'}
      open={zone !== null}
      onCancel={onClose}
      footer={null}
      width={720}
    >
      <Table
        rowKey="asset_id"
        loading={isLoading}
        dataSource={data ?? []}
        pagination={false}
        size="small"
        locale={{ emptyText: 'No assets currently in this zone.' }}
        columns={[
          { title: 'Name', dataIndex: 'name' },
          {
            title: tagLabel,
            dataIndex: 'binding_value',
            ellipsis: true,
          },
          {
            title: 'Last Seen',
            dataIndex: 'last_seen_at',
            width: 190,
            render: (v: string) => new Date(v).toLocaleString(),
          },
        ]}
      />
    </Modal>
  );
}
