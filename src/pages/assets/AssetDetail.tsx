import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from 'antd/es/button';
import Card from 'antd/es/card';
import Descriptions from 'antd/es/descriptions';
import Form from 'antd/es/form';
import Input from 'antd/es/input';
import Modal from 'antd/es/modal';
import Select from 'antd/es/select';
import Space from 'antd/es/space';
import Spin from 'antd/es/spin';
import Table from 'antd/es/table';
import Tabs from 'antd/es/tabs';
import Tag from 'antd/es/tag';
import Typography from 'antd/es/typography';
import App from 'antd/es/app';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import {
  useAsset,
  useAssetBindings,
  useAssetCurrentLocation,
  useAssetExternalPositions,
  useAssetPath,
  useBindTag,
  useRetireAsset,
  useTagReadsForBinding,
  useUnbindTag,
  useUpdateAsset,
  useZones,
} from '@/hooks/useAssets';
import { useDevices } from '@/hooks/useDevices';
import { RoleGuard } from '@/components/RoleGuard';
import { useCanPerform } from '@/components/useCanPerform';
import { SubjectTelemetryTab } from '@/components/SubjectTelemetryTab';
import { AssetEventsTab } from '@/components/AssetEventsTab';
import { LabelChips } from '@/components/LabelChips';
import { CategorySelect } from '@/components/CategorySelect';
import { useCategory } from '@/hooks/useCategories';
import type { AssetTagBindingResponse } from '@/api/generated/models/AssetTagBindingResponse';
import { AssetTagBindingCreate } from '@/api/generated/models/AssetTagBindingCreate';
import type { AssetUpdate } from '@/api/generated/models/AssetUpdate';
import type { ExternalLocationResponse } from '@/api/generated/models/ExternalLocationResponse';

const { Title, Text } = Typography;

const STATUS_COLOR: Record<string, string> = {
  active: 'green',
  retired: 'default',
  lost: 'red',
};

export function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { modal, message } = App.useApp();
  const { data: asset, isLoading } = useAsset(id);
  const { data: allBindings } = useAssetBindings(id, false);
  const { data: zones } = useZones();
  const { data: devices } = useDevices();
  const retire = useRetireAsset();
  const bind = useBindTag(id ?? '');
  const unbind = useUnbindTag(id ?? '');
  const updateAsset = useUpdateAsset();
  const canEdit = useCanPerform('editor');
  // Sprint 37 row 3.3a — resolve the asset's category name + type for the
  // Overview Descriptions row. Hook returns undefined while loading / when
  // category_id is null, which the Descriptions row already handles via
  // the optional-chain fallback below.
  const { data: category } = useCategory(asset?.category_id ?? undefined);
  const [bindOpen, setBindOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [bindForm] = Form.useForm<AssetTagBindingCreate>();
  const [editForm] = Form.useForm<AssetUpdate & { metadata_text?: string }>();

  const activeBinding = useMemo(
    () => (allBindings ?? []).find((b) => b.unbound_at === null) ?? null,
    [allBindings],
  );
  const sinceIso = useMemo(
    () => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    [],
  );
  const { data: recentReads } = useTagReadsForBinding(activeBinding?.binding_value, {
    since: sinceIso,
    limit: 100,
  });
  const { data: externalPositions } = useAssetExternalPositions(id, 50);
  // Server-side: latest known position (RFID or external — whichever is
  // newer). 404s render as `undefined` and we fall back to the synthesised
  // timeline below for backwards compatibility.
  const { data: currentLocation } = useAssetCurrentLocation(id);
  // Server-side merged path (preferred over the legacy client-side merge).
  const untilIso = useMemo(() => new Date().toISOString(), []);
  const { data: pathPoints } = useAssetPath(id, {
    since: sinceIso,
    until: untilIso,
    limit: 500,
  });

  if (isLoading || !asset) return <Spin size="large" />;

  const handleRetire = () => {
    modal.confirm({
      title: 'Retire Asset',
      content: `Mark "${asset.name}" as retired? Its bindings remain in history.`,
      okType: 'danger',
      onOk: async () => {
        await retire.mutateAsync(asset.id);
        navigate('/assets');
      },
    });
  };

  const onBind = async (values: AssetTagBindingCreate) => {
    try {
      await bind.mutateAsync(values);
      message.success('Tag bound');
      setBindOpen(false);
      bindForm.resetFields();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to bind tag');
    }
  };

  // Sprint 28 G8 — edit asset attributes (name/type/external_ref/metadata).
  // Status changes go via Retire (above). parent_asset_id is intentionally
  // omitted from this UI — hierarchy edits are out of scope per audit.
  const onEditAsset = async (values: AssetUpdate & { metadata_text?: string }) => {
    let metadata: Record<string, unknown> | null | undefined;
    if (values.metadata_text !== undefined) {
      const trimmed = values.metadata_text.trim();
      if (trimmed === '') {
        metadata = null;
      } else {
        try {
          metadata = JSON.parse(trimmed);
        } catch {
          message.error('Metadata must be valid JSON');
          return;
        }
      }
    }
    try {
      // Sprint 37 row 3.3a — category_id has 3 possible intents:
      //   * field not touched     → omit from PATCH (server leaves as-is)
      //   * field set to a uuid   → send the uuid
      //   * field cleared via "x" → send explicit null (clear it)
      // We use Form.isFieldTouched to distinguish "untouched" (which
      // would otherwise look identical to "cleared" since AntD Select
      // emits undefined for both).
      const payload: AssetUpdate = {
        name: values.name,
        asset_type: values.asset_type,
        external_ref: values.external_ref,
        metadata: metadata as AssetUpdate['metadata'],
      };
      if (editForm.isFieldTouched('category_id')) {
        payload.category_id = values.category_id ?? null;
      }
      await updateAsset.mutateAsync({
        id: asset.id,
        data: payload,
      });
      message.success('Asset updated');
      setEditOpen(false);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to update asset');
    }
  };

  const handleUnbind = (binding: AssetTagBindingResponse) => {
    modal.confirm({
      title: 'Unbind Tag',
      content: `Unbind ${binding.binding_kind} value "${binding.binding_value}"?`,
      onOk: async () => {
        await unbind.mutateAsync(binding.binding_value);
        message.success('Tag unbound');
      },
    });
  };

  const zoneById = new Map((zones ?? []).map((z) => [z.id, z]));
  const deviceById = new Map((devices ?? []).map((d) => [d.id, d]));
  // Build a "zone via reader" map: device id -> first zone whose fixed_reader_ids includes it.
  const zoneForDevice = (deviceId: string): string => {
    const z = (zones ?? []).find((zone) => (zone.fixed_reader_ids ?? []).includes(deviceId));
    return z?.name ?? '—';
  };

  // Merged source timeline (reader hops + external positions), badged.
  type TimelineRow = {
    key: string;
    at: string;
    source: 'rfid' | 'external';
    sourceLabel: string;
    location: string;
  };
  const serverTimeline: TimelineRow[] = (pathPoints ?? []).map((p, i) => ({
    key: `p-${i}-${p.recorded_at}`,
    at: p.recorded_at,
    source: p.source === 'rfid' ? 'rfid' : 'external',
    sourceLabel:
      p.source === 'rfid'
        ? p.device_id
          ? deviceById.get(p.device_id)?.name ??
            `device:${p.device_id.slice(0, 8)}`
          : 'RFID'
        : p.source,
    location: `${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}${
      p.device_id ? ` · zone: ${zoneForDevice(p.device_id)}` : ''
    }`,
  }));
  const fallbackTimeline: TimelineRow[] = [
    ...(recentReads ?? []).map((r, i) => ({
      key: `r-${i}-${r.timestamp}`,
      at: r.timestamp,
      source: 'rfid' as const,
      sourceLabel: deviceById.get(r.device_id)?.name ?? `device:${r.device_id.slice(0, 8)}`,
      location:
        r.latitude != null && r.longitude != null
          ? `${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)} · zone: ${zoneForDevice(r.device_id)}`
          : `zone: ${zoneForDevice(r.device_id)}`,
    })),
    ...(externalPositions ?? []).map((p: ExternalLocationResponse) => ({
      key: `e-${p.id}`,
      at: p.recorded_at,
      source: 'external' as const,
      sourceLabel: p.source,
      location: `${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}`,
    })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));
  // Prefer the server-side merged path when populated; otherwise fall back to
  // the local merge (covers the case where pathPoints is still loading).
  const timeline: TimelineRow[] =
    serverTimeline.length > 0
      ? [...serverTimeline].sort((a, b) => (a.at < b.at ? 1 : -1))
      : fallbackTimeline;

  const tabItems = [
    {
      key: 'overview',
      label: 'Overview',
      children: (
        <>
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Name">{asset.name}</Descriptions.Item>
            <Descriptions.Item label="Type">{asset.asset_type}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={STATUS_COLOR[asset.status] ?? 'default'}>{asset.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="External Ref">{asset.external_ref ?? '—'}</Descriptions.Item>
            {/* Sprint 37 row 3.3a — Category. Resolved via useCategory() so
                we get the canonical name + category_type even if the asset
                row doesn't carry a nested object. — shown when set; spans
                two columns so the Tag + type label have room. */}
            {asset.category_id && (
              <Descriptions.Item label="Category" span={2}>
                {(() => {
                  if (!category) return <span style={{ color: '#999' }}>{asset.category_id}</span>;
                  const typeColor: Record<string, string> = {
                    liquid_container: 'blue',
                    reference_tag: 'purple',
                    rti_container: 'cyan',
                    object: 'gold',
                  };
                  return (
                    <Space>
                      <a onClick={() => navigate(`/categories?focus=${category.id}`)}>
                        {category.name}
                      </a>
                      <Tag color={typeColor[category.category_type] ?? 'default'}>
                        {category.category_type}
                      </Tag>
                    </Space>
                  );
                })()}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Created">
              {new Date(asset.created_at).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Updated">
              {new Date(asset.updated_at).toLocaleString()}
            </Descriptions.Item>
            {asset.parent_asset_id && (
              <Descriptions.Item label="Parent" span={2}>
                <a onClick={() => navigate(`/assets/${asset.parent_asset_id}`)}>
                  {asset.parent_asset_id}
                </a>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Metadata" span={2}>
              <pre style={{ margin: 0 }}>
                {asset.metadata ? JSON.stringify(asset.metadata, null, 2) : '—'}
              </pre>
            </Descriptions.Item>
          </Descriptions>

          {/* Sprint 36 row 3.9 — labels chips. Strip lives directly under
              the Overview descriptions so it sits next to the metadata
              JSON it complements (catalogued key/value pairs vs. free-form
              JSON). Editor+ can add/remove via the popover. */}
          <div style={{ marginTop: 16 }}>
            {id && <LabelChips entityType="asset" entityId={id} />}
          </div>

          <Title level={5} style={{ marginTop: 24 }}>Current Location</Title>
          <Card size="small">
            {currentLocation ? (
              <Space direction="vertical">
                <Text>
                  <strong>Source:</strong>{' '}
                  <Tag
                    color={
                      currentLocation.latest_position_source === 'rfid'
                        ? 'blue'
                        : 'purple'
                    }
                  >
                    {currentLocation.latest_position_source === 'rfid'
                      ? 'RFID'
                      : `External · ${currentLocation.latest_position_source}`}
                  </Tag>
                </Text>
                <Text>
                  <strong>Where:</strong>{' '}
                  {currentLocation.latitude.toFixed(5)},{' '}
                  {currentLocation.longitude.toFixed(5)}
                  {currentLocation.device_id
                    ? ` · via ${
                        deviceById.get(currentLocation.device_id)?.name ??
                        `device:${currentLocation.device_id.slice(0, 8)}`
                      }`
                    : ''}
                </Text>
                <Text type="secondary">
                  Last seen:{' '}
                  {new Date(currentLocation.recorded_at).toLocaleString()}
                </Text>
              </Space>
            ) : timeline[0] ? (
              <Space direction="vertical">
                <Text>
                  <strong>Source:</strong>{' '}
                  <Tag color={timeline[0].source === 'rfid' ? 'blue' : 'purple'}>
                    {timeline[0].source === 'rfid' ? 'RFID' : 'External'} ·{' '}
                    {timeline[0].sourceLabel}
                  </Tag>
                </Text>
                <Text>
                  <strong>Where:</strong> {timeline[0].location}
                </Text>
                <Text type="secondary">
                  Last seen: {new Date(timeline[0].at).toLocaleString()}
                </Text>
              </Space>
            ) : (
              <Text type="secondary">No recent location data</Text>
            )}
          </Card>
        </>
      ),
    },
    {
      key: 'bindings',
      label: 'Bindings',
      children: (
        <>
          <Space style={{ marginBottom: 12, justifyContent: 'space-between', width: '100%' }}>
            <Text type="secondary">
              Active + historical tag-to-asset mappings. Only one active binding allowed per
              tag value.
            </Text>
            {canEdit && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setBindOpen(true)}
                disabled={asset.status !== 'active'}
              >
                Bind Tag
              </Button>
            )}
          </Space>
          <Table<AssetTagBindingResponse>
            rowKey="id"
            dataSource={allBindings ?? []}
            pagination={false}
            columns={[
              { title: 'Kind', dataIndex: 'binding_kind', width: 90 },
              { title: 'Value', dataIndex: 'binding_value' },
              {
                title: 'Bound At',
                dataIndex: 'bound_at',
                render: (v: string) => new Date(v).toLocaleString(),
              },
              {
                title: 'Unbound At',
                dataIndex: 'unbound_at',
                render: (v: string | null) =>
                  v ? new Date(v).toLocaleString() : <Tag color="green">active</Tag>,
              },
              {
                title: '',
                width: 100,
                render: (_, row) =>
                  row.unbound_at === null && canEdit ? (
                    <Button size="small" danger onClick={() => handleUnbind(row)}>
                      Unbind
                    </Button>
                  ) : null,
              },
            ]}
          />
        </>
      ),
    },
    {
      key: 'timeline',
      label: 'Recent Path',
      children: (
        <>
          <Text type="secondary">
            Merged 24h timeline: RFID reader hops via the active binding, plus any external
            (TMS / manual) position fixes. Badged by source.
          </Text>
          <Table<TimelineRow>
            style={{ marginTop: 12 }}
            rowKey="key"
            dataSource={timeline}
            pagination={{ pageSize: 25, showSizeChanger: false }}
            columns={[
              {
                title: 'When',
                dataIndex: 'at',
                width: 200,
                render: (v: string) => new Date(v).toLocaleString(),
              },
              {
                title: 'Source',
                dataIndex: 'source',
                width: 220,
                render: (_, row) => (
                  <Tag color={row.source === 'rfid' ? 'blue' : 'purple'}>
                    {row.source === 'rfid' ? 'RFID' : 'External'} · {row.sourceLabel}
                  </Tag>
                ),
              },
              { title: 'Location / Zone', dataIndex: 'location' },
            ]}
          />
        </>
      ),
    },
    {
      key: 'telemetry',
      label: 'Telemetry',
      children: id ? (
        <SubjectTelemetryTab
          subjectKind="asset"
          subjectId={id}
          latest={asset.latest_telemetry}
        />
      ) : null,
    },
    {
      // Sprint 38 row 3.9c — Events Log. Synthesised lifecycle stream
      // (created / updated / retired + every bind/unbind + external
      // position fixes) from data already fetched by the page. Raw RFID
      // reader hops stay on the Recent Path tab.
      key: 'events',
      label: 'Events Log',
      children: (
        <AssetEventsTab
          asset={asset}
          bindings={allBindings}
          externalPositions={externalPositions}
        />
      ),
    },
  ];

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
        <Title level={2} style={{ margin: 0 }}>{asset.name}</Title>
        <Space>
          <RoleGuard roles={['admin', 'editor']}>
            <Button
              icon={<EditOutlined />}
              onClick={() => {
                editForm.setFieldsValue({
                  name: asset.name,
                  asset_type: asset.asset_type,
                  external_ref: asset.external_ref,
                  category_id: asset.category_id ?? undefined,
                  metadata_text: JSON.stringify(asset.metadata ?? {}, null, 2),
                });
                setEditOpen(true);
              }}
            >
              Edit
            </Button>
          </RoleGuard>
          {asset.status === 'active' && (
            <RoleGuard roles={['admin', 'editor']}>
              <Button danger onClick={handleRetire} loading={retire.isPending}>
                Retire
              </Button>
            </RoleGuard>
          )}
        </Space>
      </div>
      <Tabs items={tabItems} />

      <Modal
        title="Bind Tag"
        open={bindOpen}
        onCancel={() => setBindOpen(false)}
        onOk={() => bindForm.submit()}
        confirmLoading={bind.isPending}
      >
        <Form
          form={bindForm}
          layout="vertical"
          onFinish={onBind}
          initialValues={{ binding_kind: AssetTagBindingCreate.binding_kind.EPC }}
        >
          <Form.Item
            label="Binding Kind"
            name="binding_kind"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: AssetTagBindingCreate.binding_kind.EPC, label: 'EPC' },
                { value: AssetTagBindingCreate.binding_kind.TID, label: 'TID' },
                { value: AssetTagBindingCreate.binding_kind.DEVICE, label: 'Device' },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="Tag Value"
            name="binding_value"
            rules={[{ required: true }]}
          >
            <Input placeholder="e.g. urn:epc:tag:sgtin-96:..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Sprint 28 G8 — edit asset attributes. */}
      <Modal
        title={`Edit Asset — ${asset.name}`}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={() => editForm.submit()}
        confirmLoading={updateAsset.isPending}
        destroyOnHidden
        width={600}
      >
        <Form form={editForm} layout="vertical" onFinish={onEditAsset}>
          <Form.Item label="Name" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Asset Type" name="asset_type">
            <Input placeholder="e.g. forklift, pallet" />
          </Form.Item>
          {/* Sprint 37 row 3.3a — Category picker on Edit. Cleared selection
              sends explicit null to clear the FK (see onEditAsset above). */}
          <Form.Item
            label="Category"
            name="category_id"
            help="Pick from the curated catalog at /categories. Clear to remove."
          >
            <CategorySelect placeholder="Select a category (optional)" data-testid="asset-edit-category" />
          </Form.Item>
          <Form.Item label="External Reference" name="external_ref">
            <Input placeholder="External system identifier" />
          </Form.Item>
          <Form.Item
            label="Metadata (JSON)"
            name="metadata_text"
            help="Free-form JSON object. Leave empty to clear."
          >
            <Input.TextArea rows={6} style={{ fontFamily: 'monospace' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Suppress unused-var warning when zones is empty */}
      {zoneById.size === 0 && null}
    </div>
  );
}
