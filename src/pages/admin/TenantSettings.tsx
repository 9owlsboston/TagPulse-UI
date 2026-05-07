/**
 * Tenant Settings (Sprint 15b Phase F + Sprint 21).
 *
 * Tabbed admin page for tenant-scope configuration:
 *  • General — toggle `tracking_modes` (asset / inventory) and the
 *    Sprint 21 subject-scoped telemetry opt-in (`telemetry_subject_kinds`).
 *  • Sensor metrics — embeds the existing TelemetryModels editor.
 *  • Tag-data fields — embeds the existing TagDataMappings editor; only
 *    visible while `inventory` mode is enabled (per docs/design/admin-ui).
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Switch, Tabs, message } from 'antd';
import { useTenantConfig, useUpdateTenantConfig } from '@/hooks/useTenantConfig';
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
  const inventoryEnabled = data?.tracking_modes.includes('inventory') ?? false;
  const items = [
    { key: 'general', label: 'General', children: <GeneralTab /> },
    { key: 'telemetry', label: 'Sensor metrics', children: <TelemetryModels /> },
    ...(inventoryEnabled
      ? [{ key: 'tag-data', label: 'Tag-data fields', children: <TagDataMappings /> }]
      : []),
  ];
  return <Tabs defaultActiveKey="general" items={items} />;
}

export default TenantSettings;
