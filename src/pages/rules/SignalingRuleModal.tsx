/**
 * Sprint 41 Phase F2 — "Add Alert Rule" modal (signaling kind).
 *
 * Implements the reference layout (see
 * `docs/design/reference-design-remediation.md` UI gap 3.5 + ADR 021 v2)
 * with sections: Event Name → Event Type → Category × Labels scoping →
 * Trigger → Confidence → Retention → Connections → Advanced. Posts to
 * `POST /v1/tenants/{slug}/rules` with the standard `RuleCreate` payload
 * — the backend infers `kind: 'signaling'` from `event_type` being
 * non-null (see `RuleResponse._populate_kind` in
 * `src/tagpulse/models/rule_schemas.py`).
 *
 * Client-side validation rejects invalid (event_type, trigger) pairs
 * before submit using the {@link SIGNALING_VALID_PAIRS} table from
 * `src/types.ts`, which mirrors the backend `SIGNALING_VALID_PAIRS`
 * authoritative truth. F4 vitest coverage parametrises both directions
 * (every valid pair submits cleanly; at least one invalid pair per
 * event_type fails to submit).
 *
 * Per Phase E1, this modal does NOT hit a `/sensing-events` URL — the
 * "Signaling Events" framing lives only in the UI label layer.
 */
import { useCallback, useMemo, useState } from 'react';
import Modal from 'antd/es/modal';
import Form from 'antd/es/form';
import Input from 'antd/es/input';
import Select from 'antd/es/select';
import InputNumber from 'antd/es/input-number';
import Switch from 'antd/es/switch';
import Typography from 'antd/es/typography';
import Collapse from 'antd/es/collapse';
import Tag from 'antd/es/tag';
import message from 'antd/es/message';
import { useCreateRule } from '@/hooks/useRules';
import { useCategories } from '@/hooks/useCategories';
import { useIntegrations } from '@/hooks/useIntegrations';
import {
  SIGNALING_VALID_PAIRS,
  type RuleCreate,
  type SignalingEventType,
  type SignalingTrigger,
} from '@/types';

const { Text } = Typography;
const { TextArea } = Input;

const EVENT_TYPE_OPTIONS: { value: SignalingEventType; label: string; help: string }[] = [
  { value: 'location', label: 'Location', help: 'Subject-to-zone attribution (reader-bound or geofence).' },
  { value: 'geolocation', label: 'Geolocation', help: 'Raw GPS / WGS84 coordinate stream.' },
  { value: 'temperature', label: 'Temperature', help: 'Subject-bound temperature metric stream.' },
  { value: 'geofencing', label: 'Geofencing', help: 'Polygonal entry/exit spatial primitive.' },
];

const TRIGGER_LABELS: Record<SignalingTrigger, string> = {
  on_change: 'On change',
  periodic: 'Periodic',
  on_inactivity: 'On inactivity',
  on_inference: 'On inference (attribution settled)',
  on_entry: 'On entry',
  on_exit: 'On exit',
};

const ACTION_TYPE_OPTIONS: { value: 'webhook' | 'email' | 'notification'; label: string }[] = [
  { value: 'webhook', label: 'Webhook' },
  { value: 'email', label: 'Email' },
  { value: 'notification', label: 'In-app notification' },
];

const PROCESSOR_OPTIONS: { value: 'isolated_zones' | 'overlapping_zones'; label: string; help: string }[] = [
  {
    value: 'isolated_zones',
    label: 'Isolated zones (default)',
    help: 'Single-zone attribution; the pre-Sprint-41 behaviour.',
  },
  {
    value: 'overlapping_zones',
    label: 'Overlapping zones',
    help: 'Multi-zone attribution with RSSI floor + aging weight + bleed filter (Sprint 41).',
  },
];

/** Sentinel cap for retention (days) — matches backend `confidence_threshold` upper bound semantics loosely. */
const RETENTION_MAX_DAYS = 365;

interface FormValues {
  name: string;
  description?: string;
  event_type: SignalingEventType;
  trigger: SignalingTrigger;
  category_ids?: string[];
  asset_label_filters?: string; // free-text JSON (advanced); rarely used today
  zone_label_filters?: string;
  site_label_filters?: string;
  confidence_threshold?: number;
  retention_days?: number;
  action_type: 'webhook' | 'email' | 'notification';
  action_url?: string;
  action_email?: string;
  integration_ids?: string[];
  processor?: 'isolated_zones' | 'overlapping_zones';
  enabled: boolean;
}

export interface SignalingRuleModalProps {
  open: boolean;
  onClose: () => void;
  /** Optional success callback (defaults to closing the modal). */
  onCreated?: () => void;
}

export function SignalingRuleModal({ open, onClose, onCreated }: SignalingRuleModalProps) {
  const [form] = Form.useForm<FormValues>();
  const [submitting, setSubmitting] = useState(false);
  const createRule = useCreateRule();
  const { data: categories } = useCategories();
  const { data: integrations } = useIntegrations();

  const eventType = Form.useWatch('event_type', form);
  const actionType = Form.useWatch('action_type', form);

  /**
   * Available triggers narrow as the event_type changes. The Select
   * re-keys on event_type so any stale selection is dropped (a
   * previously-selected `on_entry` becomes invalid when the user
   * switches from `geofencing` to `temperature`).
   */
  const triggerOptions = useMemo(() => {
    if (!eventType) return [];
    return SIGNALING_VALID_PAIRS[eventType].map((t) => ({ value: t, label: TRIGGER_LABELS[t] }));
  }, [eventType]);

  /**
   * Discriminated-union guard called from the Form `validateTrigger`
   * field-level validator. Returns a rejected promise (AntD's signal for
   * a failed validation) when the (event_type, trigger) pair is not in
   * the authoritative table. Defence-in-depth: the Trigger Select only
   * lists valid options for the current event_type, but a user could
   * still submit a stale value if they mutate the form between field
   * changes (e.g. via a paste-and-tab race).
   */
  const validateSignalingPair = useCallback(
    (_rule: unknown, value: SignalingTrigger | undefined) => {
      if (!eventType) return Promise.reject(new Error('Pick an event type first.'));
      if (!value) return Promise.reject(new Error('Pick a trigger.'));
      const valid = SIGNALING_VALID_PAIRS[eventType] as readonly SignalingTrigger[];
      if (!valid.includes(value)) {
        return Promise.reject(
          new Error(
            `Trigger "${value}" is not valid for event type "${eventType}". ` +
              `Valid triggers: ${valid.join(', ')}.`,
          ),
        );
      }
      return Promise.resolve();
    },
    [eventType],
  );

  /** Build the RuleCreate payload from form values. */
  const buildPayload = (values: FormValues): RuleCreate => {
    const condition_type = `signaling.${values.event_type}.${values.trigger}` as const;

    // condition_config carries trigger-shape-specific knobs. We keep
    // this minimal in the UI today — operators can edit advanced
    // per-trigger knobs (cadence_minutes, dwell thresholds, etc.) via
    // the legacy editor sub-tab until a dedicated per-trigger editor
    // ships. Confidence + retention live as top-level rule columns,
    // not in condition_config.
    const condition_config: Record<string, unknown> = {};
    if (values.retention_days !== undefined) condition_config.retention_days = values.retention_days;

    const action_config: Record<string, unknown> = {};
    if (values.action_type === 'webhook' && values.action_url) action_config.url = values.action_url;
    if (values.action_type === 'email' && values.action_email) action_config.email = values.action_email;

    const payload: RuleCreate = {
      name: values.name,
      description: values.description,
      condition_type,
      condition_config,
      action_type: values.action_type,
      action_config,
      enabled: values.enabled,
      event_type: values.event_type,
      trigger: values.trigger,
      processor: values.processor ?? null,
      category_ids: values.category_ids ?? [],
      integration_ids: values.integration_ids?.length ? values.integration_ids : null,
    };
    if (values.confidence_threshold !== undefined) {
      payload.confidence_threshold = values.confidence_threshold;
    }
    return payload;
  };

  const handleSubmit = async () => {
    let values: FormValues;
    try {
      values = await form.validateFields();
    } catch {
      return; // AntD already surfaces per-field errors inline
    }
    setSubmitting(true);
    try {
      const payload = buildPayload(values);
      await createRule.mutateAsync(payload);
      message.success(`Alert rule "${values.name}" created`);
      form.resetFields();
      onCreated?.();
      onClose();
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Unknown error';
      message.error(`Failed to create rule: ${detail}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Add Alert Rule"
      okText="Create rule"
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={submitting}
      width={680}
      destroyOnHidden
      data-testid="signaling-rule-modal"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          enabled: true,
          action_type: 'webhook',
          confidence_threshold: 0.7,
          processor: 'isolated_zones',
        }}
        data-testid="signaling-rule-form"
      >
        {/* Event Name */}
        <Form.Item
          name="name"
          label="Event name"
          rules={[
            { required: true, message: 'Name is required.' },
            { max: 255, message: 'Name is too long (max 255).' },
          ]}
        >
          <Input placeholder="e.g. Forklift left loading dock" data-testid="field-name" />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <TextArea rows={2} placeholder="What this rule signals and to whom." />
        </Form.Item>

        {/* Event Type */}
        <Form.Item
          name="event_type"
          label="Event type"
          rules={[{ required: true, message: 'Pick an event type.' }]}
          extra={
            eventType ? (
              <Text type="secondary">{EVENT_TYPE_OPTIONS.find((o) => o.value === eventType)?.help}</Text>
            ) : null
          }
        >
          <Select
            options={EVENT_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            placeholder="Pick an event type"
            data-testid="field-event-type"
            onChange={() => {
              // Reset trigger so an invalid pair never survives an event_type swap.
              form.setFieldValue('trigger', undefined);
            }}
          />
        </Form.Item>

        {/* Trigger (depends on event_type) */}
        <Form.Item
          name="trigger"
          label="Trigger"
          rules={[{ validator: validateSignalingPair }]}
          dependencies={['event_type']}
        >
          <Select
            options={triggerOptions}
            placeholder={eventType ? 'Pick a trigger' : 'Pick an event type first'}
            disabled={!eventType}
            data-testid="field-trigger"
          />
        </Form.Item>

        {/* Category × Labels scoping */}
        <Form.Item
          name="category_ids"
          label="Categories"
          help="Restrict the rule to subjects in these categories (empty = all)."
        >
          <Select
            mode="multiple"
            allowClear
            placeholder="Select one or more categories"
            options={(categories ?? []).map((c) => ({
              value: c.id,
              label: (
                <span>
                  {c.name} <Tag>{c.category_type}</Tag>
                </span>
              ),
            }))}
            data-testid="field-categories"
          />
        </Form.Item>

        {/* Confidence */}
        <Form.Item
          name="confidence_threshold"
          label="Confidence threshold"
          help="Minimum confidence (0.0–1.0) before the rule fires."
          rules={[
            {
              type: 'number',
              min: 0,
              max: 1,
              message: 'Confidence must be between 0.0 and 1.0.',
            },
          ]}
        >
          <InputNumber
            min={0}
            max={1}
            step={0.05}
            style={{ width: 160 }}
            data-testid="field-confidence"
          />
        </Form.Item>

        {/* Retention */}
        <Form.Item
          name="retention_days"
          label="Retention (days)"
          help="How long firings of this rule are kept in the alerts table."
          rules={[
            {
              type: 'number',
              min: 1,
              max: RETENTION_MAX_DAYS,
              message: `Retention must be 1–${RETENTION_MAX_DAYS} days.`,
            },
          ]}
        >
          <InputNumber min={1} max={RETENTION_MAX_DAYS} style={{ width: 160 }} data-testid="field-retention" />
        </Form.Item>

        {/* Connections (Action + Integration routing) */}
        <Form.Item
          name="action_type"
          label="Action"
          rules={[{ required: true }]}
        >
          <Select options={ACTION_TYPE_OPTIONS} data-testid="field-action-type" />
        </Form.Item>
        {actionType === 'webhook' && (
          <Form.Item
            name="action_url"
            label="Webhook URL"
            rules={[{ required: true, type: 'url', message: 'Must be a URL.' }]}
          >
            <Input placeholder="https://example.com/hook" data-testid="field-action-url" />
          </Form.Item>
        )}
        {actionType === 'email' && (
          <Form.Item
            name="action_email"
            label="Email recipient"
            rules={[{ required: true, type: 'email', message: 'Must be an email.' }]}
          >
            <Input placeholder="ops@example.com" data-testid="field-action-email" />
          </Form.Item>
        )}

        <Form.Item
          name="integration_ids"
          label="Route to integrations"
          help="Empty = broadcast to all enabled integrations (legacy behaviour). Pick one or more to route this rule's firings only to those connections."
        >
          <Select
            mode="multiple"
            allowClear
            placeholder="Broadcast to all (default)"
            options={(integrations ?? []).map((i) => ({
              value: i.id,
              label: `${i.name} (${i.type})`,
            }))}
            data-testid="field-integrations"
          />
        </Form.Item>

        {/* Advanced (collapsed by default) */}
        <Collapse
          ghost
          items={[
            {
              key: 'advanced',
              label: 'Advanced',
              children: (
                <>
                  <Form.Item
                    name="processor"
                    label="Processor"
                    help="Attribution algorithm for location/geofencing events. Ignored for temperature/geolocation."
                  >
                    <Select
                      options={PROCESSOR_OPTIONS.map((p) => ({
                        value: p.value,
                        label: (
                          <span>
                            <strong>{p.label}</strong> <Text type="secondary">— {p.help}</Text>
                          </span>
                        ),
                      }))}
                      data-testid="field-processor"
                    />
                  </Form.Item>
                  <Form.Item name="enabled" label="Enabled on create" valuePropName="checked">
                    <Switch data-testid="field-enabled" />
                  </Form.Item>
                </>
              ),
            },
          ]}
        />
      </Form>
    </Modal>
  );
}
