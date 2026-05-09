import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Collapse,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  App,
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  useAssetsInZone,
  useCreateSite,
  useCreateZone,
  useDeleteSite,
  useDeleteZone,
  useSites,
  useZones,
} from '@/hooks/useAssets';
import { useDevices } from '@/hooks/useDevices';
import { useCanPerform } from '@/components/useCanPerform';
import { RoleGuard } from '@/components/RoleGuard';
import type { ZoneResponse } from '@/api/generated/models/ZoneResponse';
import type { SiteResponse } from '@/api/generated/models/SiteResponse';
import { ZoneCreate } from '@/api/generated/models/ZoneCreate';
import type { SiteCreate } from '@/api/generated/models/SiteCreate';
import { PolygonDraw } from '@/components/PolygonDraw';

const { Title, Text } = Typography;

export function SitesZones() {
  const { modal, message } = App.useApp();
  const { data: sites, isLoading: sitesLoading } = useSites();
  const { data: zones, isLoading: zonesLoading } = useZones();
  const { data: devices } = useDevices();
  const createSite = useCreateSite();
  const createZone = useCreateZone();
  const deleteSite = useDeleteSite();
  const deleteZone = useDeleteZone();
  const isAdmin = useCanPerform('admin');

  const [siteModalOpen, setSiteModalOpen] = useState(false);
  const [zoneModalSiteId, setZoneModalSiteId] = useState<string | null>(null);
  const [occupantsZone, setOccupantsZone] = useState<ZoneResponse | null>(null);
  const [siteForm] = Form.useForm<SiteCreate>();
  const [zoneForm] = Form.useForm<ZoneCreate>();
  const zoneKind = Form.useWatch('kind', zoneForm);

  const zonesBySite = useMemo(() => {
    const map = new Map<string, ZoneResponse[]>();
    for (const z of zones ?? []) {
      const arr = map.get(z.site_id) ?? [];
      arr.push(z);
      map.set(z.site_id, arr);
    }
    return map;
  }, [zones]);

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

  const onCreateSite = async (values: SiteCreate) => {
    try {
      await createSite.mutateAsync(values);
      message.success(`Site "${values.name}" created`);
      setSiteModalOpen(false);
      siteForm.resetFields();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to create site');
    }
  };

  const onCreateZone = async (values: ZoneCreate) => {
    try {
      await createZone.mutateAsync({ ...values, site_id: zoneModalSiteId! });
      message.success(`Zone "${values.name}" created`);
      setZoneModalSiteId(null);
      zoneForm.resetFields();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to create zone');
    }
  };

  const handleDeleteSite = (site: SiteResponse) => {
    modal.confirm({
      title: 'Delete Site',
      content: `Delete "${site.name}"? Its zones will be deleted too.`,
      okType: 'danger',
      onOk: () => deleteSite.mutateAsync(site.id),
    });
  };

  const handleDeleteZone = (zone: ZoneResponse) => {
    modal.confirm({
      title: 'Delete Zone',
      content: `Delete zone "${zone.name}"?`,
      okType: 'danger',
      onOk: () => deleteZone.mutateAsync(zone.id),
    });
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
        <Title level={2} style={{ margin: 0 }}>Sites &amp; Zones</Title>
        <RoleGuard roles={['admin']}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setSiteModalOpen(true)}>
            New Site
          </Button>
        </RoleGuard>
      </div>

      <Card loading={sitesLoading || zonesLoading}>
        {(sites ?? []).length === 0 ? (
          <Text type="secondary">No sites yet. Create one to start defining zones.</Text>
        ) : (
          <Collapse
            defaultActiveKey={(sites ?? []).map((s) => s.id)}
            items={(sites ?? []).map((site) => {
              const siteZones = zonesBySite.get(site.id) ?? [];
              return {
                key: site.id,
                label: (
                  <Space>
                    <strong>{site.name}</strong>
                    <Text type="secondary">{site.address ?? '—'}</Text>
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
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteSite(site)}
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
                      { title: 'Name', dataIndex: 'name' },
                      {
                        title: 'Kind',
                        dataIndex: 'kind',
                        width: 130,
                        render: (v: string) => <Tag>{v}</Tag>,
                      },
                      {
                        title: 'Readers',
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
                        width: 160,
                        render: (_, row) => (
                          <Space>
                            <Button
                              size="small"
                              onClick={() => setOccupantsZone(row)}
                            >
                              Occupants
                            </Button>
                            {isAdmin ? (
                              <Button
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => handleDeleteZone(row)}
                              />
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
        )}
      </Card>

      <Modal
        title="Create Site"
        open={siteModalOpen}
        onCancel={() => setSiteModalOpen(false)}
        onOk={() => siteForm.submit()}
        confirmLoading={createSite.isPending}
      >
        <Form
          form={siteForm}
          layout="vertical"
          onFinish={onCreateSite}
          initialValues={{ default_timezone: 'UTC' }}
        >
          <Form.Item label="Name" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Address" name="address">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Default Timezone" name="default_timezone">
            <Input placeholder="e.g. UTC, America/Los_Angeles" />
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
        </Form>
      </Modal>

      <ZoneOccupantsModal
        zone={occupantsZone}
        onClose={() => setOccupantsZone(null)}
      />
    </div>
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
            title: 'Type',
            dataIndex: 'asset_type',
            width: 110,
            render: (v: string) => <Tag>{v}</Tag>,
          },
          {
            title: 'Tag',
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
