import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Form from 'antd/es/form';
import Input from 'antd/es/input';
import Button from 'antd/es/button';
import Card from 'antd/es/card';
import Typography from 'antd/es/typography';
import message from 'antd/es/message';
import { useCreateDevice } from '@/hooks/useDevices';
import { useLabel } from '@/lib/uiConfig';
import {
  PendingLabelPicker,
  attachPendingLabels,
  type PendingLabel,
} from '@/components/PendingLabelPicker';
import type { DeviceCreate } from '@/types';

const { Title } = Typography;
const { TextArea } = Input;

export function DeviceRegister() {
  const deviceLabel = useLabel('device');
  const navigate = useNavigate();
  const createDevice = useCreateDevice();
  const [form] = Form.useForm<DeviceCreate & { metadataJson?: string }>();
  // Sprint 37 row 3.9d — client-side label queue.
  const [pendingLabels, setPendingLabels] = useState<PendingLabel[]>([]);

  const handleFinish = async (values: DeviceCreate & { metadataJson?: string }) => {
    let metadata: Record<string, unknown> | undefined;
    if (values.metadataJson) {
      try {
        metadata = JSON.parse(values.metadataJson) as Record<string, unknown>;
      } catch {
        message.error('Invalid JSON in metadata');
        return;
      }
    }
    const created = await createDevice.mutateAsync({
      name: values.name,
      device_type: values.device_type,
      firmware_version: values.firmware_version,
      metadata,
    });
    message.success('Device registered');
    // Sprint 37 row 3.9d — flush queued labels onto the new device.
    if (pendingLabels.length > 0) {
      const { ok, failed } = await attachPendingLabels(
        'device',
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
    navigate('/devices');
  };

  return (
    <div>
      <Title level={2}>{`Register ${deviceLabel}`}</Title>
      <Card style={{ maxWidth: 600 }}>
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item name="name" label="Name" rules={[{ required: true, max: 255 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="device_type" label="Device Type" initialValue="rfid_reader">
            <Input />
          </Form.Item>
          <Form.Item name="firmware_version" label="Firmware Version">
            <Input />
          </Form.Item>
          <Form.Item name="metadataJson" label="Metadata (JSON)">
            <TextArea rows={4} placeholder='{"location": "warehouse-a"}' />
          </Form.Item>
          {/* Sprint 37 row 3.9d — queued labels flushed after register. */}
          <Form.Item
            label="Labels"
            help="Optional. Queued labels are attached after the device is registered."
          >
            <PendingLabelPicker
              entityType="device"
              value={pendingLabels}
              onChange={setPendingLabels}
              disabled={createDevice.isPending}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={createDevice.isPending}>
              Register
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
