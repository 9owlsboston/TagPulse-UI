/**
 * CSV import page (Sprint 27, A5).
 *
 * Admin-only page with three tabs for bulk importing Products, Lots,
 * and Stock Items from CSV files.
 */
import { useState } from 'react';
import Button from 'antd/es/button';
import Card from 'antd/es/card';
import Space from 'antd/es/space';
import Table from 'antd/es/table';
import Tabs from 'antd/es/tabs';
import Typography from 'antd/es/typography';
import Upload from 'antd/es/upload';
import message from 'antd/es/message';
import Alert from 'antd/es/alert';
import { InboxOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { RoleGuard } from '@/components/RoleGuard';
import { useLabel } from '@/lib/uiConfig';

const { Title, Text } = Typography;
const { Dragger } = Upload;

const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

function getAuthHeaders(): Record<string, string> {
  const token = (window as unknown as Record<string, unknown>).__TAGPULSE_TOKEN__ as string | undefined;
  const tenantId = (window as unknown as Record<string, unknown>).__TAGPULSE_TENANT_ID__ as string | undefined;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  else if (tenantId) headers['X-Tenant-ID'] = tenantId;
  return headers;
}

interface ImportResult {
  created: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0]!.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map((line) => {
    const vals = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = vals[i] ?? '';
    });
    return row;
  });
  return { headers, rows };
}

interface TabContentProps {
  entity: 'products' | 'lots' | 'stock-items';
  endpoint: string;
}

function ImportTab({ entity, endpoint }: TabContentProps) {
  const [preview, setPreview] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const upload = useMutation({
    mutationFn: async (f: File) => {
      const formData = new FormData();
      formData.append('file', f);
      const res = await fetch(`${BASE}${endpoint}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Import failed (${res.status}): ${body}`);
      }
      return res.json() as Promise<ImportResult>;
    },
    onSuccess: (result) => {
      message.success(`Imported: ${result.created} created, ${result.skipped} skipped, ${result.errors.length} errors`);
      setPreview(null);
      setFile(null);
    },
    onError: (err: Error) => message.error(err.message),
  });

  const handleFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setPreview(parseCsv(text));
    };
    reader.readAsText(f);
    return false; // prevent auto upload
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {!preview && (
        <Dragger
          accept=".csv"
          maxCount={1}
          showUploadList={false}
          beforeUpload={(f) => handleFile(f as unknown as File)}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">Click or drag a CSV file to preview</p>
          <p className="ant-upload-hint">Expected headers for {entity} import</p>
        </Dragger>
      )}
      {preview && (
        <>
          <Alert
            type="info"
            message={`${preview.rows.length} rows parsed from CSV`}
            action={
              <Space>
                <Button
                  type="primary"
                  loading={upload.isPending}
                  onClick={() => file && upload.mutate(file)}
                >
                  Import
                </Button>
                <Button onClick={() => { setPreview(null); setFile(null); }}>
                  Clear
                </Button>
              </Space>
            }
          />
          <Table
            rowKey={(_, i) => String(i)}
            dataSource={preview.rows.slice(0, 50)}
            pagination={false}
            scroll={{ x: 'max-content' }}
            size="small"
            columns={preview.headers.map((h) => ({
              title: h,
              dataIndex: h,
              ellipsis: true,
              width: 150,
            }))}
            footer={() =>
              preview.rows.length > 50 ? (
                <Text type="secondary">Showing first 50 of {preview.rows.length} rows</Text>
              ) : null
            }
          />
        </>
      )}
    </Space>
  );
}

export function CsvImport() {
  const lotsLabel = useLabel('lot', { plural: true });
  const stockItemsLabel = useLabel('stockItem', { plural: true });
  return (
    <RoleGuard roles={['admin']}>
      <div>
        <Title level={2}>CSV Import</Title>
        <Card>
          <Tabs
            items={[
              {
                key: 'products',
                label: 'Products',
                children: <ImportTab entity="products" endpoint="/products/import" />,
              },
              {
                key: 'lots',
                label: lotsLabel,
                children: <ImportTab entity="lots" endpoint="/lots/import" />,
              },
              {
                key: 'stock-items',
                label: stockItemsLabel,
                children: <ImportTab entity="stock-items" endpoint="/stock-items/import" />,
              },
            ]}
          />
        </Card>
      </div>
    </RoleGuard>
  );
}

export default CsvImport;
