import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Input, Select, Switch, Button, Card, InputNumber, Typography, Steps, Space, Descriptions, message, AutoComplete } from 'antd';
import { useCreateRule, useUpdateRule, useRule } from '@/hooks/useRules';
import { useDevices } from '@/hooks/useDevices';
import { useTelemetryModels } from '@/hooks/useTelemetryModels';
import { useProducts } from '@/hooks/useInventory';
import { SitesZonesService } from '@/api/generated/services/SitesZonesService';
import { useQuery } from '@tanstack/react-query';
import type { RuleCreate } from '@/types';

const { Title } = Typography;
const { TextArea } = Input;

const CONDITION_TYPES = [
  { label: 'Threshold', value: 'threshold' },
  { label: 'Absence', value: 'absence' },
  { label: 'Rate Change', value: 'rate_change' },
  { label: 'Stock — below threshold', value: 'stock.below_threshold' },
  { label: 'Stock — expiring within', value: 'stock.expiring_within' },
  { label: 'Stock — unexpected zone', value: 'stock.unexpected_in_zone' },
];

const ACTION_TYPES = [
  { label: 'Webhook', value: 'webhook' },
  { label: 'Email', value: 'email' },
  { label: 'Notification', value: 'notification' },
];

type ConditionType =
  | 'threshold'
  | 'absence'
  | 'rate_change'
  | 'stock.below_threshold'
  | 'stock.expiring_within'
  | 'stock.unexpected_in_zone';

interface FormValues {
  name: string;
  description?: string;
  condition_type: ConditionType;
  action_type: 'webhook' | 'email' | 'notification';
  enabled: boolean;
  scope_device_id?: string;
  field?: string;
  operator?: string;
  threshold_value?: number;
  absence_minutes?: number;
  tag_id?: string;
  window_minutes?: number;
  change_percent?: number;
  action_url?: string;
  action_email?: string;
  // Inventory conditions
  stock_product_id?: string;
  stock_threshold?: number;
  stock_expiring_days?: number;
  stock_allowed_zone_ids?: string[];
}

const STEP_ITEMS = [
  { title: 'Condition' },
  { title: 'Action' },
  { title: 'Scope' },
  { title: 'Review' },
];

export function RuleEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { data: existing } = useRule(id ?? '');
  const { data: devices } = useDevices();
  const { data: models } = useTelemetryModels();
  const { data: products } = useProducts({ limit: 500 });
  const { data: zones } = useQuery({
    queryKey: ['zones'],
    queryFn: () => SitesZonesService.listZonesZonesGet(),
  });
  const createRule = useCreateRule();
  const updateRule = useUpdateRule();
  const [form] = Form.useForm<FormValues>();
  const [step, setStep] = useState(0);
  const conditionType = Form.useWatch('condition_type', form);
  const actionType = Form.useWatch('action_type', form);

  const deviceOptions = [
    { label: 'All Devices (global)', value: '' },
    ...(devices ?? []).map((d) => ({ label: d.name, value: d.id })),
  ];

  // Threshold "field" suggestions: tag-read built-ins + every metric_name from
  // every telemetry model + a tag_data.* hint (per rfid-tag-data-model.md §7).
  const fieldSuggestions: { value: string; label: string }[] = [
    { value: 'signal_strength', label: 'signal_strength (tag read)' },
    ...(models ?? []).flatMap((m) =>
      m.metrics.map((metric) => ({
        value: metric.name,
        label: `${metric.name}${metric.unit ? ` (${metric.unit})` : ''} — ${m.device_type}`,
      })),
    ),
    { value: 'tag_data.', label: 'tag_data.<key> — RFID sensor-tag value' },
  ];

  const handleFinish = async (values: FormValues) => {
    let condition_config: Record<string, unknown> = {};
    if (values.condition_type === 'threshold') {
      condition_config = { field: values.field, operator: values.operator, value: values.threshold_value };
    } else if (values.condition_type === 'absence') {
      condition_config = { minutes: values.absence_minutes, tag_id: values.tag_id };
    } else if (values.condition_type === 'rate_change') {
      condition_config = { window_minutes: values.window_minutes, change_percent: values.change_percent };
    } else if (values.condition_type === 'stock.below_threshold') {
      condition_config = { product_id: values.stock_product_id, threshold: values.stock_threshold };
    } else if (values.condition_type === 'stock.expiring_within') {
      condition_config = { product_id: values.stock_product_id || undefined, days: values.stock_expiring_days };
    } else {
      condition_config = {
        product_id: values.stock_product_id || undefined,
        allowed_zone_ids: values.stock_allowed_zone_ids ?? [],
      };
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
      scope_device_id: values.scope_device_id || undefined,
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

  const nextStep = async () => {
    try {
      if (step === 0) {
        const fieldsByType: Record<ConditionType, string[]> = {
          threshold: ['field', 'operator', 'threshold_value'],
          absence: ['absence_minutes'],
          rate_change: ['window_minutes', 'change_percent'],
          'stock.below_threshold': ['stock_product_id', 'stock_threshold'],
          'stock.expiring_within': ['stock_expiring_days'],
          'stock.unexpected_in_zone': ['stock_allowed_zone_ids'],
        };
        await form.validateFields(['name', 'condition_type', ...(fieldsByType[conditionType as ConditionType] ?? [])]);
      } else if (step === 1) {
        await form.validateFields(['action_type']);
      }
      setStep(step + 1);
    } catch {
      // validation errors shown inline
    }
  };

  const values = form.getFieldsValue();

  return (
    <div>
      <Title level={2}>{isEdit ? 'Edit Rule' : 'Create Rule'}</Title>
      <Steps current={step} items={STEP_ITEMS} style={{ marginBottom: 24 }} />
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
            scope_device_id: existing.scope_device_id ?? '',
          } : { enabled: true, condition_type: 'threshold', action_type: 'webhook', scope_device_id: '' }}
        >
          {/* Step 0: Condition */}
          <div style={{ display: step === 0 ? 'block' : 'none' }}>
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
                  <AutoComplete
                    options={fieldSuggestions}
                    placeholder="signal_strength, temperature_c, tag_data.<key>, …"
                    filterOption={(input, option) =>
                      (option?.value ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  />
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

            {conditionType === 'stock.below_threshold' && (
              <>
                <Form.Item name="stock_product_id" label="Product" rules={[{ required: true }]}>
                  <Select
                    showSearch
                    options={(products ?? []).map((p) => ({ value: p.id, label: `${p.sku} — ${p.name}` }))}
                    filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                    placeholder="Select SKU"
                  />
                </Form.Item>
                <Form.Item name="stock_threshold" label="Threshold" rules={[{ required: true }]}>
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </>
            )}

            {conditionType === 'stock.expiring_within' && (
              <>
                <Form.Item name="stock_product_id" label="Product (optional — all if empty)">
                  <Select
                    allowClear
                    showSearch
                    options={(products ?? []).map((p) => ({ value: p.id, label: `${p.sku} — ${p.name}` }))}
                    filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                  />
                </Form.Item>
                <Form.Item name="stock_expiring_days" label="Days" rules={[{ required: true }]}>
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </>
            )}

            {conditionType === 'stock.unexpected_in_zone' && (
              <>
                <Form.Item name="stock_product_id" label="Product (optional — all if empty)">
                  <Select
                    allowClear
                    showSearch
                    options={(products ?? []).map((p) => ({ value: p.id, label: `${p.sku} — ${p.name}` }))}
                    filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                  />
                </Form.Item>
                <Form.Item
                  name="stock_allowed_zone_ids"
                  label="Allowed zones"
                  rules={[{ required: true, message: 'Pick at least one zone' }]}
                >
                  <Select
                    mode="multiple"
                    showSearch
                    options={(zones ?? []).map((z) => ({ value: z.id, label: z.name }))}
                    filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                    placeholder="Stock seen outside these zones triggers an alert"
                  />
                </Form.Item>
              </>
            )}
          </div>

          {/* Step 1: Action */}
          <div style={{ display: step === 1 ? 'block' : 'none' }}>
            <Form.Item name="action_type" label="Action Type" rules={[{ required: true }]}>
              <Select options={ACTION_TYPES} />
            </Form.Item>
            {actionType === 'webhook' && (
              <Form.Item name="action_url" label="Webhook URL" rules={[{ required: true }]}>
                <Input placeholder="https://..." />
              </Form.Item>
            )}
            {actionType === 'email' && (
              <Form.Item name="action_email" label="Email" rules={[{ required: true }]}>
                <Input placeholder="alert@example.com" />
              </Form.Item>
            )}
          </div>

          {/* Step 2: Scope */}
          <div style={{ display: step === 2 ? 'block' : 'none' }}>
            <Form.Item name="scope_device_id" label="Scope to Device">
              <Select options={deviceOptions} placeholder="All devices" />
            </Form.Item>
            <Form.Item name="enabled" label="Enabled" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>

          {/* Step 3: Review */}
          {step === 3 && (
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Name">{values.name}</Descriptions.Item>
              <Descriptions.Item label="Condition">{values.condition_type}</Descriptions.Item>
              <Descriptions.Item label="Action">{values.action_type}</Descriptions.Item>
              <Descriptions.Item label="Scope">{values.scope_device_id ? `Device: ${values.scope_device_id}` : 'All devices'}</Descriptions.Item>
              <Descriptions.Item label="Enabled">{values.enabled ? 'Yes' : 'No'}</Descriptions.Item>
            </Descriptions>
          )}

          <Space style={{ marginTop: 24 }}>
            {step > 0 && <Button onClick={() => setStep(step - 1)}>Back</Button>}
            {step < 3 && <Button type="primary" onClick={nextStep}>Next</Button>}
            {step === 3 && (
              <Button type="primary" htmlType="submit" loading={createRule.isPending || updateRule.isPending}>
                {isEdit ? 'Update' : 'Create'}
              </Button>
            )}
          </Space>
        </Form>
      </Card>
    </div>
  );
}
