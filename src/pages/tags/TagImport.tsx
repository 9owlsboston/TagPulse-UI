import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Alert from 'antd/es/alert';
import Button from 'antd/es/button';
import Card from 'antd/es/card';
import Result from 'antd/es/result';
import Space from 'antd/es/space';
import Steps from 'antd/es/steps';
import Table from 'antd/es/table';
import Typography from 'antd/es/typography';
import Upload from 'antd/es/upload';
import message from 'antd/es/message';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { useImportTags } from '@/hooks/useImportTags';
import { TAGS_QUERY_KEY } from '@/hooks/useTags';
import { useCanPerform } from '@/components/useCanPerform';
import type { TagImportResult } from '@/api/generated/models/TagImportResult';
import type { TagImportRowError } from '@/api/generated/models/TagImportRowError';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

// Per ADR 028 §Governance the file ceiling is 8 MiB / 10 000 rows.
// We mirror the size guard client-side so the operator gets immediate
// feedback rather than waiting on a 413 round trip. Row count we leave
// to the server (counting requires reading the file we're about to
// upload anyway — no value in duplicating).
const MAX_BYTES = 8 * 1024 * 1024;

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
  return e.status ? `HTTP ${e.status}` : 'Unknown error';
}

/**
 * Sprint 45 Phase C — CSV import wizard for the tag registry.
 *
 * Three-step Steps control implementing the ADR 028 §Governance #2
 * dry-run-first contract:
 *
 *   1. **Upload** — pick a CSV (with the required `epc_hex` column),
 *      client-side size guard at 8 MiB.
 *   2. **Preview** — POST with `?dry_run=true`. On 200 the server
 *      mints a single-use confirmation token bound to this CSV's
 *      content + tenant + operator and returns a 10-EPC sample.
 *      On 422 we render the row-level errors and force the operator
 *      back to step 1 (per ADR 028 OQ 4 the import is all-or-nothing
 *      — no partial commit option).
 *   3. **Confirm** — POST the same CSV with `?confirm=<token>`.
 *      201 → committed inline; 202 → queued for a second admin
 *      because the row count crossed the tenant's two-person
 *      threshold (10 000 by default). Pending-id link to the
 *      Phase F inbox if 202.
 */
export function TagImport() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const canImport = useCanPerform('editor');
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<TagImportResult | null>(null);
  const [committed, setCommitted] = useState<TagImportResult | null>(null);
  const importMutation = useImportTags();

  if (!canImport) {
    return (
      <Result
        status="403"
        title="Tag import requires editor or admin role."
        extra={<Button onClick={() => navigate('/tags')}>Back to tags</Button>}
      />
    );
  }

  const beforeUpload = (f: File) => {
    if (f.size > MAX_BYTES) {
      message.error(`File is ${(f.size / 1024 / 1024).toFixed(1)} MiB; the 8 MiB cap applies.`);
      return Upload.LIST_IGNORE;
    }
    setFile(f);
    setPreview(null);
    // Returning false tells AntD's Dragger NOT to auto-upload — we
    // submit explicitly via the wizard's Next button.
    return false;
  };

  const runDryRun = async () => {
    if (!file) return;
    try {
      const result = await importMutation.mutateAsync({ file, dryRun: true });
      setPreview(result);
      if (result.errors && result.errors.length > 0) {
        // Stay on step 1 so the operator can fix and re-upload; the
        // server didn't mint a token so there's nothing to confirm.
        setStep(1);
      } else {
        setStep(1);
      }
    } catch (e) {
      message.error(`Dry-run failed: ${extractServerMessage(e)}`);
    }
  };

  const runConfirm = async () => {
    if (!file || !preview?.token) return;
    try {
      const result = await importMutation.mutateAsync({ file, confirm: preview.token });
      setCommitted(result);
      setStep(2);
      qc.invalidateQueries({ queryKey: [TAGS_QUERY_KEY] });
    } catch (e) {
      message.error(`Confirm failed: ${extractServerMessage(e)}`);
    }
  };

  const reset = () => {
    setStep(0);
    setFile(null);
    setPreview(null);
    setCommitted(null);
  };

  const errorColumns = [
    { title: 'Row', dataIndex: 'row', key: 'row', width: 80 },
    { title: 'EPC', dataIndex: 'epc_hex', key: 'epc_hex', render: (v: string | null) => (v ? <Text code>{v}</Text> : <Text type="secondary">(missing)</Text>) },
    { title: 'Error', dataIndex: 'error', key: 'error' },
  ];

  return (
    <div data-testid="tag-import-page">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Title level={3} style={{ margin: 0 }}>Import tags</Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Bulk-register tags from a CSV. Required column: <Text code>epc_hex</Text>. Up to 10 000 rows
          / 8 MiB per import; 10 imports per tenant per hour. Imports of 10 000+ rows require a second
          admin's approval (ADR 028 §Governance #4).
        </Paragraph>

        <Steps
          current={step}
          items={[
            { title: 'Upload' },
            { title: 'Preview' },
            { title: 'Confirm' },
          ]}
        />

        {step === 0 && (
          <Card>
            <Dragger
              accept=".csv,text/csv"
              maxCount={1}
              beforeUpload={beforeUpload}
              onRemove={() => {
                setFile(null);
                return true;
              }}
              fileList={
                file
                  ? [{ uid: '-1', name: file.name, status: 'done', size: file.size } as UploadFile]
                  : []
              }
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Click or drag a CSV file here</p>
              <p className="ant-upload-hint">
                CSV must include an <Text code>epc_hex</Text> column. Other columns are ignored.
              </p>
            </Dragger>
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Button
                type="primary"
                disabled={!file}
                loading={importMutation.isPending}
                onClick={runDryRun}
                data-testid="tag-import-dryrun-btn"
              >
                Validate (dry-run)
              </Button>
            </div>
          </Card>
        )}

        {step === 1 && preview && (
          <Card title="Preview">
            {preview.errors && preview.errors.length > 0 ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Alert
                  type="error"
                  showIcon
                  message={`CSV rejected — ${preview.errors.length} row(s) invalid.`}
                  description="The import is all-or-nothing (ADR 028 OQ 4). Fix the rows below and re-upload."
                />
                <Table<TagImportRowError>
                  size="small"
                  rowKey="row"
                  columns={errorColumns}
                  dataSource={preview.errors}
                  pagination={{ pageSize: 25 }}
                />
                <div style={{ textAlign: 'right' }}>
                  <Button onClick={reset}>Start over</Button>
                </div>
              </Space>
            ) : (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Alert
                  type="success"
                  showIcon
                  message={`${preview.rows_total} row(s) ready to import.`}
                  description={
                    <>
                      Token expires in {preview.expires_in ?? '?'} seconds. Re-uploading or editing
                      the CSV will invalidate the token.
                    </>
                  }
                />
                {preview.sample && preview.sample.length > 0 && (
                  <Card size="small" title="Sample EPCs">
                    <Space wrap>
                      {preview.sample.map((epc) => (
                        <Text code key={epc}>{epc}</Text>
                      ))}
                    </Space>
                  </Card>
                )}
                <div style={{ textAlign: 'right' }}>
                  <Space>
                    <Button onClick={reset}>Start over</Button>
                    <Button
                      type="primary"
                      loading={importMutation.isPending}
                      onClick={runConfirm}
                      data-testid="tag-import-confirm-btn"
                    >
                      Confirm import
                    </Button>
                  </Space>
                </div>
              </Space>
            )}
          </Card>
        )}

        {step === 2 && committed && (
          committed.requires_approval ? (
            <Result
              status="info"
              title="Import queued for second-admin approval."
              subTitle={`Pending ID: ${committed.pending_id}. A second admin must approve before any rows are written.`}
              extra={[
                <Button key="back" onClick={() => navigate('/tags')}>Back to tags</Button>,
                <Button key="another" type="primary" onClick={reset}>Import another</Button>,
              ]}
            />
          ) : (
            <Result
              status="success"
              title={`${committed.rows_created} tag(s) imported.`}
              subTitle={
                committed.rows_skipped > 0
                  ? `${committed.rows_skipped} EPC(s) already existed and were skipped (idempotent).`
                  : undefined
              }
              extra={[
                <Button key="view" onClick={() => navigate('/tags')}>View tags</Button>,
                <Button key="another" type="primary" onClick={reset}>Import another</Button>,
              ]}
            />
          )
        )}
      </Space>
    </div>
  );
}
