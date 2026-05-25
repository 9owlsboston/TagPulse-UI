/**
 * Tenant Settings (Sprint 15b Phase F + Sprint 21 + Sprint 28 G7).
 *
 * Tabbed admin page for tenant-scope configuration:
 *  • General — toggle `tracking_modes` (asset / inventory) and the
 *    Sprint 21 subject-scoped telemetry opt-in (`telemetry_subject_kinds`).
 *  • Sensor metrics — embeds the existing TelemetryModels editor.
 *  • Tag-data fields — embeds the existing TagDataMappings editor; only
 *    visible while `inventory` mode is enabled (per docs/design/admin-ui).
 *  • Map — admin-only inline editor for the tile provider blob (G7).
 */
import { useEffect, useState } from 'react';
import Alert from 'antd/es/alert';
import Button from 'antd/es/button';
import Card from 'antd/es/card';
import Form from 'antd/es/form';
import Input from 'antd/es/input';
import Select from 'antd/es/select';
import Switch from 'antd/es/switch';
import Tabs from 'antd/es/tabs';
import Typography from 'antd/es/typography';
import message from 'antd/es/message';
import { useTenantConfig, useUpdateTenantConfig } from '@/hooks/useTenantConfig';
import { useMapConfig, useUpdateMapConfig, OSM_FALLBACK } from '@/hooks/useMapConfig';
import { useCanPerform } from '@/components/useCanPerform';
import { TelemetryModels } from '@/pages/telemetry-models/TelemetryModels';
import { TagDataMappings } from '@/pages/inventory/TagDataMappings';

type Mode = 'asset' | 'inventory';
type SubjectKind = 'device' | 'asset' | 'lot' | 'stock_item' | 'zone';

const SUBJECT_KIND_LABELS: Record<Exclude<SubjectKind, 'device'>, string> = {
  asset: 'Assets',
  lot: 'Lots',
  stock_item: 'Stock items',
  zone: 'Zones',
};

function GeneralTab() {
  const { data, isLoading } = useTenantConfig();
  const update = useUpdateTenantConfig();
  const [asset, setAsset] = useState(true);
  const [inventory, setInventory] = useState(false);
  const [subjectKinds, setSubjectKinds] = useState<Record<Exclude<SubjectKind, 'device'>, boolean>>({
    asset: false,
    lot: false,
    stock_item: false,
    zone: false,
  });

  useEffect(() => {
    if (!data) return;
    setAsset(data.tracking_modes.includes('asset'));
    setInventory(data.tracking_modes.includes('inventory'));
    const enabled = data.telemetry_subject_kinds ?? [];
    setSubjectKinds({
      asset: enabled.includes('asset'),
      lot: enabled.includes('lot'),
      stock_item: enabled.includes('stock_item'),
      zone: enabled.includes('zone'),
    });
  }, [data]);

  // Prevent the user from turning off the last enabled mode — the backend
  // rejects an empty `tracking_modes` array (see Pydantic validator) and the
  // UI sidebar would have nothing to show. We disable the lone-on switch so
  // the invalid state can never be reached, even before Save.
  const onlyAssetOn = asset && !inventory;
  const onlyInventoryOn = inventory && !asset;

  const onSave = async () => {
    const modes: Mode[] = [];
    if (asset) modes.push('asset');
    if (inventory) modes.push('inventory');
    if (modes.length === 0) {
      // Defense in depth — the disabled switches above should make this
      // unreachable, but keep the guard in case state ever desyncs.
      message.error('At least one tracking mode must remain enabled');
      return;
    }
    // `device` is always implicitly on in the backend; UI only exposes
    // the four non-device kinds. We always include `device` so the backend
    // doesn't drop it on a PATCH.
    const kinds: SubjectKind[] = ['device'];
    (Object.keys(subjectKinds) as Array<Exclude<SubjectKind, 'device'>>).forEach((k) => {
      if (subjectKinds[k]) kinds.push(k);
    });
    try {
      await update.mutateAsync({ tracking_modes: modes, telemetry_subject_kinds: kinds });
      message.success('Tenant configuration updated');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Update failed');
    }
  };

  return (
    <>
      <Card title="Tracking modes" loading={isLoading} style={{ marginBottom: 16 }}>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Toggling a mode shows or hides the matching sidebar pages and ingestion enrichments. At least one mode must stay on."
        />
        <Form layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 6 }}>
          <Form.Item
            label="Asset tracking"
            help={onlyAssetOn ? 'Enable inventory first to disable asset tracking.' : undefined}
          >
            <Switch checked={asset} disabled={onlyAssetOn} onChange={setAsset} />
          </Form.Item>
          <Form.Item
            label="Inventory tracking"
            help={onlyInventoryOn ? 'Enable asset first to disable inventory tracking.' : undefined}
          >
            <Switch checked={inventory} disabled={onlyInventoryOn} onChange={setInventory} />
          </Form.Item>
        </Form>
      </Card>

      <Card title="Subject-scoped telemetry" loading={isLoading} style={{ marginBottom: 16 }}>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="When enabled, tag-borne telemetry that resolves to the chosen subject is fanned out to a separate subject-scoped row in addition to the device row. Required for the Asset Telemetry tab, the Lot cold-chain card, and `telemetry.threshold` rules with subject_kind ≠ device. (`device` is always on.)"
        />
        <Form layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 6 }}>
          {(Object.keys(SUBJECT_KIND_LABELS) as Array<Exclude<SubjectKind, 'device'>>).map((k) => (
            <Form.Item key={k} label={SUBJECT_KIND_LABELS[k]}>
              <Switch
                checked={subjectKinds[k]}
                onChange={(v) => setSubjectKinds((prev) => ({ ...prev, [k]: v }))}
              />
            </Form.Item>
          ))}
        </Form>
      </Card>

      <Form.Item wrapperCol={{ offset: 6 }}>
        <Button type="primary" onClick={onSave} loading={update.isPending}>
          Save
        </Button>
      </Form.Item>
    </>
  );
}

export function TenantSettings() {
  const { data } = useTenantConfig();
  const isAdmin = useCanPerform('admin');
  const inventoryEnabled = data?.tracking_modes.includes('inventory') ?? false;
  const items = [
    { key: 'general', label: 'General', children: <GeneralTab /> },
    { key: 'telemetry', label: 'Sensor metrics', children: <TelemetryModels /> },
    ...(inventoryEnabled
      ? [{ key: 'tag-data', label: 'Tag-data fields', children: <TagDataMappings /> }]
      : []),
    ...(isAdmin
      ? [{ key: 'map', label: 'Map', children: <MapConfigTab /> }]
      : []),
  ];
  return <Tabs defaultActiveKey="general" items={items} />;
}

export default TenantSettings;

// Sprint 28 G7 — inline editor for /tenant/map-config (admin only).
// Backend `TileProviderUpdate` is `{ provider: Record<string, any> | null }`,
// so we offer a kind dropdown + per-kind fields and serialize them into
// the provider blob. "OSM (default)" sends `{ provider: null }` so the
// backend falls back to the system default.
type ProviderKind = 'osm' | 'mapbox' | 'maptiler' | 'self_hosted' | 'custom';

type MapForm = {
  kind: ProviderKind;
  api_key?: string;
  style_id?: string;
  tile_url_template?: string;
  attribution?: string;
  custom_json?: string;
};

function MapConfigTab() {
  const { data: current, isLoading } = useMapConfig();
  const update = useUpdateMapConfig();
  const [form] = Form.useForm<MapForm>();
  const kind = Form.useWatch('kind', form);
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    if (!current) return;
    // Best-effort prefill from the resolved config. The backend returns
    // the *resolved* config (URL/attribution), not the raw `provider` blob,
    // so for non-default kinds the operator may need to re-enter the api
    // key (the resolved URL doesn't always reveal it).
    const initialKind = (current.kind as ProviderKind) ?? 'osm';
    form.setFieldsValue({
      kind: initialKind,
      tile_url_template: current.tile_url_template,
      attribution: current.attribution,
    });
  }, [current, form]);

  const onSave = async (values: MapForm) => {
    let provider: Record<string, unknown> | null;
    switch (values.kind) {
      case 'osm':
        provider = null;
        break;
      case 'mapbox':
        if (!values.api_key) {
          message.error('Mapbox requires an API key');
          return;
        }
        provider = {
          kind: 'mapbox',
          api_key: values.api_key,
          style_id: values.style_id ?? 'mapbox/streets-v12',
          attribution: values.attribution ?? '© Mapbox © OpenStreetMap',
        };
        break;
      case 'maptiler':
        if (!values.api_key) {
          message.error('MapTiler requires an API key');
          return;
        }
        provider = {
          kind: 'maptiler',
          api_key: values.api_key,
          style_id: values.style_id ?? 'streets-v2',
          attribution: values.attribution ?? '© MapTiler © OpenStreetMap contributors',
        };
        break;
      case 'self_hosted':
        if (!values.tile_url_template) {
          message.error('Self-hosted requires a tile URL template');
          return;
        }
        provider = {
          kind: 'self_hosted',
          tile_url_template: values.tile_url_template,
          attribution: values.attribution ?? 'Self-hosted tiles',
        };
        break;
      case 'custom': {
        const trimmed = (values.custom_json ?? '').trim();
        if (!trimmed) {
          message.error('Paste a provider JSON blob');
          return;
        }
        try {
          provider = JSON.parse(trimmed);
        } catch {
          message.error('Custom provider must be valid JSON');
          return;
        }
        break;
      }
      default:
        provider = null;
    }
    try {
      await update.mutateAsync({ provider });
      message.success('Map config updated');
      setPreviewKey((k) => k + 1);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Failed to update map config');
    }
  };

  const resolved = current ?? OSM_FALLBACK;
  const sampleTile = resolved.tile_url_template
    .replace('{s}', (resolved.subdomains ?? ['a'])[0] ?? 'a')
    .replace('{z}', '4')
    .replace('{x}', '8')
    .replace('{y}', '5');

  return (
    <>
      <Card title="Tile provider" loading={isLoading} style={{ marginBottom: 16 }}>
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="The backend stores a provider blob; the GET endpoint returns the resolved tile URL and attribution. Switching to OSM (default) clears the stored provider."
        />
        <Form<MapForm>
          form={form}
          layout="vertical"
          onFinish={onSave}
          initialValues={{ kind: 'osm' }}
        >
          <Form.Item label="Provider" name="kind" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'osm', label: 'OSM (default, public tiles)' },
                { value: 'mapbox', label: 'Mapbox' },
                { value: 'maptiler', label: 'MapTiler' },
                { value: 'self_hosted', label: 'Self-hosted' },
                { value: 'custom', label: 'Custom (raw JSON)' },
              ]}
            />
          </Form.Item>
          {(kind === 'mapbox' || kind === 'maptiler') && (
            <>
              <Form.Item label="API key" name="api_key" rules={[{ required: true }]}>
                <Input.Password placeholder="sk… or pk…" autoComplete="off" />
              </Form.Item>
              <Form.Item label="Style ID" name="style_id">
                <Input placeholder={kind === 'mapbox' ? 'mapbox/streets-v12' : 'streets-v2'} />
              </Form.Item>
              <Form.Item label="Attribution (HTML allowed)" name="attribution">
                <Input />
              </Form.Item>
            </>
          )}
          {kind === 'self_hosted' && (
            <>
              <Form.Item
                label="Tile URL template"
                name="tile_url_template"
                rules={[{ required: true }]}
                help="Use {s}/{z}/{x}/{y} placeholders."
              >
                <Input placeholder="https://tiles.example.com/{z}/{x}/{y}.png" />
              </Form.Item>
              <Form.Item label="Attribution" name="attribution">
                <Input />
              </Form.Item>
            </>
          )}
          {kind === 'custom' && (
            <Form.Item
              label="Provider JSON"
              name="custom_json"
              rules={[{ required: true }]}
              help="Raw provider blob — see services.map_config for shape."
            >
              <Input.TextArea rows={6} style={{ fontFamily: 'monospace' }} />
            </Form.Item>
          )}
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={update.isPending}>
              Save
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Live preview" style={{ marginBottom: 16 }}>
        <Typography.Paragraph type="secondary">
          Sample tile from the resolved provider (z=4, x=8, y=5). Reflects the
          *current* server-side config — click Save above and the preview will
          re-fetch.
        </Typography.Paragraph>
        <img
          key={previewKey}
          src={sampleTile}
          alt="Sample map tile"
          width={256}
          height={256}
          style={{ border: '1px solid var(--color-border)', borderRadius: 4 }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.opacity = '0.3';
          }}
        />
        <Typography.Paragraph style={{ marginTop: 8 }}>
          <strong>Attribution:</strong>{' '}
          <span dangerouslySetInnerHTML={{ __html: resolved.attribution }} />
        </Typography.Paragraph>
      </Card>
    </>
  );
}
