import { useState } from 'react';
import Alert from 'antd/es/alert';
import Form from 'antd/es/form';
import Input from 'antd/es/input';
import Modal from 'antd/es/modal';
import Space from 'antd/es/space';
import Typography from 'antd/es/typography';
import message from 'antd/es/message';
import { useCreateTransfer } from '@/hooks/useTransfers';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface Props {
  open: boolean;
  onClose: () => void;
  /** EPC pre-filled (e.g. from TagDetail). When omitted operator pastes them. */
  prefillEpcs?: string[];
}

interface ApiErrorLike {
  status?: number;
  body?: { detail?: unknown } | unknown;
}

function extractServerMessage(err: unknown): string {
  if (!err || typeof err !== 'object') return String(err);
  const e = err as ApiErrorLike;
  if (e.body && typeof e.body === 'object' && 'detail' in (e.body as object)) {
    const detail = (e.body as { detail?: unknown }).detail;
    if (typeof detail === 'string') return detail;
    return JSON.stringify(detail);
  }
  return e.status ? `HTTP ${e.status}` : String(err);
}

/**
 * Modal for `POST /tag-transfers` — initiate a cross-tenant transfer
 * (Sprint 46 Phase D, ADR 028 §Transfers).
 *
 * The server validates every EPC is owned-and-active, the target tenant
 * exists and is `active`, and rejects self-transfers (422). We surface
 * the raw server `detail` on error rather than re-implementing those
 * checks client-side — the server is authoritative and runbook readers
 * benefit from seeing the exact response.
 */
export function NewTransferModal({ open, onClose, prefillEpcs }: Props) {
  const [form] = Form.useForm<{ epcs: string; to_tenant_slug: string }>();
  const create = useCreateTransfer();
  const [, setVersion] = useState(0);

  const initialEpcs = prefillEpcs?.join('\n') ?? '';

  const handleOk = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const epcs = values.epcs
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (epcs.length === 0) {
      message.error('At least one EPC is required.');
      return;
    }
    try {
      const result = await create.mutateAsync({
        epcs,
        to_tenant_slug: values.to_tenant_slug.trim(),
      });
      message.success(
        `Transfer requested — ${result.length} EPC(s) queued for ${values.to_tenant_slug}.`,
      );
      form.resetFields();
      onClose();
    } catch (e) {
      message.error(`Transfer rejected: ${extractServerMessage(e)}`);
    }
  };

  return (
    <Modal
      title="New tag transfer"
      open={open}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      onOk={handleOk}
      okText="Request transfer"
      okButtonProps={{ loading: create.isPending, 'data-testid': 'new-transfer-submit' } as never}
      destroyOnHidden
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Alert
          type="info"
          showIcon
          message="Transfers are server-validated and counterparty-completed."
          description={
            <Paragraph style={{ marginBottom: 0 }}>
              Every EPC must be owned by this tenant and in <Text code>active</Text> status.
              The receiving tenant must be active. The transfer enters <Text code>requested</Text>{' '}
              status — the source tag stays <Text code>active</Text> until the receiving tenant
              acks, at which point it flips to <Text code>transferred_out</Text>.
            </Paragraph>
          }
        />
        <Form
          form={form}
          layout="vertical"
          initialValues={{ epcs: initialEpcs, to_tenant_slug: '' }}
          onValuesChange={() => setVersion((v) => v + 1)}
        >
          <Form.Item
            label="EPCs (one per line, or comma/space separated)"
            name="epcs"
            rules={[{ required: true, message: 'Paste at least one EPC.' }]}
          >
            <TextArea
              rows={6}
              placeholder="3034F4A1C8E0000000000001&#10;3034F4A1C8E0000000000002"
              data-testid="new-transfer-epcs"
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>
          <Form.Item
            label="Receiving tenant slug"
            name="to_tenant_slug"
            rules={[
              { required: true, message: 'Target tenant slug is required.' },
              {
                pattern: /^[a-z0-9][a-z0-9-]*$/,
                message: 'Slugs are lowercase letters, digits, and hyphens.',
              },
            ]}
          >
            <Input placeholder="acme-corp" data-testid="new-transfer-tenant" />
          </Form.Item>
        </Form>
      </Space>
    </Modal>
  );
}
