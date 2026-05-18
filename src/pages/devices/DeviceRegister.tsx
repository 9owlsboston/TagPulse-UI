import { useNavigate } from 'react-router-dom';
import Form from 'antd/es/form';
import Input from 'antd/es/input';
import Button from 'antd/es/button';
import Card from 'antd/es/card';
import Typography from 'antd/es/typography';
import message from 'antd/es/message';
import { useCreateDevice } from '@/hooks/useDevices';
import type { DeviceCreate } from '@/types';

const { Title } = Typography;
const { TextArea } = Input;

export function DeviceRegister() {
  const navigate = useNavigate();
  const createDevice = useCreateDevice();
  const [form] = Form.useForm<DeviceCreate & { metadataJson?: string }>();

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
    await createDevice.mutateAsync({
      name: values.name,
      device_type: values.device_type,
      firmware_version: values.firmware_version,
      metadata,
    });
    message.success('Device registered');
    navigate('/devices');
  };

  return (
    <div>
      <Title level={2}>Register Device</Title>
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
