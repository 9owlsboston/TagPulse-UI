/**
 * Tenant Settings (Sprint 15b Phase F).
 *
 * Tabbed admin page for tenant-scope configuration:
 *  • General — toggle `tracking_modes` (asset / inventory).
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

function GeneralTab() {
  const { data, isLoading } = useTenantConfig();
  const update = useUpdateTenantConfig();
  const [asset, setAsset] = useState(true);
  const [inventory, setInventory] = useState(false);

  useEffect(() => {
    if (!data) return;
    setAsset(data.tracking_modes.includes('asset'));
    setInventory(data.tracking_modes.includes('inventory'));
  }, [data]);

  const onSave = async () => {
    const modes: Mode[] = [];
    if (asset) modes.push('asset');
    if (inventory) modes.push('inventory');
    if (modes.length === 0) {
      message.error('At least one tracking mode must remain enabled');
      return;
    }
    try {
      await update.mutateAsync({ tracking_modes: modes });
      message.success('Tenant configuration updated');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Update failed');
    }
  };

  return (
    <Card title="Tracking modes" loading={isLoading}>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Toggling a mode shows or hides the matching sidebar pages and ingestion enrichments. At least one mode must stay on."
      />
      <Form layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 6 }}>
        <Form.Item label="Asset tracking">
          <Switch checked={asset} onChange={setAsset} />
        </Form.Item>
        <Form.Item label="Inventory tracking">
          <Switch checked={inventory} onChange={setInventory} />
        </Form.Item>
        <Form.Item wrapperCol={{ offset: 6 }}>
          <Button type="primary" onClick={onSave} loading={update.isPending}>
            Save
          </Button>
        </Form.Item>
      </Form>
    </Card>
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
