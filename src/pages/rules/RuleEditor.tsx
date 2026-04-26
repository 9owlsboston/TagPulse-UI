import { useNavigate, useParams } from 'react-router-dom';
import { Form, Input, Select, Switch, Button, Card, InputNumber, Typography, message } from 'antd';
import { useCreateRule, useUpdateRule, useRule } from '@/hooks/useRules';
import type { RuleCreate } from '@/types';

const { Title } = Typography;
const { TextArea } = Input;

const CONDITION_TYPES = [
  { label: 'Threshold', value: 'threshold' },
  { label: 'Absence', value: 'absence' },
  { label: 'Rate Change', value: 'rate_change' },
];

const ACTION_TYPES = [
  { label: 'Webhook', value: 'webhook' },
  { label: 'Email', value: 'email' },
  { label: 'Notification', value: 'notification' },
];

interface FormValues {
  name: string;
  description?: string;
  condition_type: 'threshold' | 'absence' | 'rate_change';
  action_type: 'webhook' | 'email' | 'notification';
  enabled: boolean;
  // Threshold fields
  field?: string;
  operator?: string;
  threshold_value?: number;
  // Absence fields
  absence_minutes?: number;
  tag_id?: string;
  // Rate change fields
  window_minutes?: number;
  change_percent?: number;
  // Action config
  action_url?: string;
  action_email?: string;
}

export function RuleEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { data: existing } = useRule(id ?? '');
  const createRule = useCreateRule();
  const updateRule = useUpdateRule();
  const [form] = Form.useForm<FormValues>();
  const conditionType = Form.useWatch('condition_type', form);

  const handleFinish = async (values: FormValues) => {
    let condition_config: Record<string, unknown> = {};
    if (values.condition_type === 'threshold') {
      condition_config = { field: values.field, operator: values.operator, value: values.threshold_value };
    } else if (values.condition_type === 'absence') {
      condition_config = { minutes: values.absence_minutes, tag_id: values.tag_id };
    } else {
      condition_config = { window_minutes: values.window_minutes, change_percent: values.change_percent };
    }

    const action_config: Record<string, unknown> = {};
    if (values.action_type === 'webhook') action_config.url = values.action_url;
    if (values.action_type === 'email') action_config.email = values.action_email;

    const payload: RuleCreate = {
      name: values.name,
      description: values.description,
      condition_type: values.condition_type,
      condition_config,
      action_type: values.action_type,
      action_config,
      enabled: values.enabled,
    };

    if (isEdit) {
      await updateRule.mutateAsync({ id, data: payload });
      message.success('Rule updated');
    } else {
      await createRule.mutateAsync(payload);
      message.success('Rule created');
    }
    navigate('/rules');
  };

  return (
    <div>
      <Title level={2}>{isEdit ? 'Edit Rule' : 'Create Rule'}</Title>
      <Card style={{ maxWidth: 700 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={existing ? {
            name: existing.name,
            description: existing.description,
            condition_type: existing.condition_type,
            action_type: existing.action_type,
            enabled: existing.enabled,
          } : { enabled: true, condition_type: 'threshold', action_type: 'webhook' }}
        >
          <Form.Item name="name" label="Name" rules={[{ required: true, max: 255 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item name="condition_type" label="Condition Type" rules={[{ required: true }]}>
            <Select options={CONDITION_TYPES} />
          </Form.Item>

          {conditionType === 'threshold' && (
            <>
              <Form.Item name="field" label="Field" rules={[{ required: true }]}>
                <Input placeholder="e.g. signal_strength" />
              </Form.Item>
              <Form.Item name="operator" label="Operator" rules={[{ required: true }]}>
                <Select options={[
                  { label: '>', value: 'gt' },
                  { label: '<', value: 'lt' },
                  { label: '>=', value: 'gte' },
                  { label: '<=', value: 'lte' },
                  { label: '=', value: 'eq' },
                ]} />
              </Form.Item>
              <Form.Item name="threshold_value" label="Value" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </>
          )}

          {conditionType === 'absence' && (
            <>
              <Form.Item name="absence_minutes" label="Minutes" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="tag_id" label="Tag ID (optional)">
                <Input />
              </Form.Item>
            </>
          )}

          {conditionType === 'rate_change' && (
            <>
              <Form.Item name="window_minutes" label="Window (minutes)" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="change_percent" label="Change %" rules={[{ required: true }]}>
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </>
          )}

          <Form.Item name="action_type" label="Action Type" rules={[{ required: true }]}>
            <Select options={ACTION_TYPES} />
          </Form.Item>
          <Form.Item name="action_url" label="Webhook URL">
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="action_email" label="Email">
            <Input placeholder="alert@example.com" />
          </Form.Item>
          <Form.Item name="enabled" label="Enabled" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={createRule.isPending || updateRule.isPending}>
              {isEdit ? 'Update' : 'Create'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
