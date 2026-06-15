/**
 * Branding — Sprint 33 QW6 + branding-logo-upload chore.
 *
 * Admin-only page for editing per-tenant branding overrides
 * (`display_name`, `logo_url`, `logo_collapsed_url`, `brand_color`). Logos can
 * be **uploaded** (read client-side into a size-capped base64 `data:` URL) or
 * pasted as an `https://` URL — both are just strings the `<img>` renders. Live
 * preview re-renders as the form changes so admins can see the Sider header
 * (expanded + collapsed) before saving.
 *
 * Backend contract: `PATCH /tenant/branding` (TenantBrandingUpdate). Each field
 * is optional; an empty string clears the override. The backend caps an
 * uploaded data URL at 96 KB encoded; we validate the same client-side.
 */
import Alert from 'antd/es/alert';
import Button from 'antd/es/button';
import Card from 'antd/es/card';
import Form from 'antd/es/form';
import Input from 'antd/es/input';
import Space from 'antd/es/space';
import Spin from 'antd/es/spin';
import Typography from 'antd/es/typography';
import Upload from 'antd/es/upload';
import message from 'antd/es/message';
import { UploadOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useCanPerform } from '@/components/useCanPerform';
import { useTenantBranding, useUpdateTenantBranding } from '@/hooks/useTenantBranding';
import { DEFAULT_BRAND_COLOR } from '@/theme/ThemeProvider';
import type { TenantBrandingUpdate } from '@/api/generated/models/TenantBrandingUpdate';

const { Title, Text } = Typography;

// Keep in lock-step with the backend cap (_MAX_LOGO_DATA_URL_LEN). 96 KB of
// base64 ≈ 70 KB of image — generous for an SVG wordmark or small PNG icon.
const MAX_LOGO_DATA_URL_BYTES = 96 * 1024;
const ACCEPTED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/gif'];
const ACCEPT_ATTR = '.png,.jpg,.jpeg,.svg,.webp,.gif';

interface FormShape {
  brand_color: string;
  display_name: string;
  logo_url: string;
  logo_collapsed_url: string;
}

const EMPTY_FORM: FormShape = {
  brand_color: '',
  display_name: '',
  logo_url: '',
  logo_collapsed_url: '',
};

type LogoField = 'logo_url' | 'logo_collapsed_url';

/** Read a File into a base64 data URL, rejecting bad types / oversize files. */
function readLogoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      reject(new Error('Logo must be a PNG, JPEG, SVG, WebP, or GIF image.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (result.length > MAX_LOGO_DATA_URL_BYTES) {
        reject(new Error('Image is too large (max ~70 KB). Use a smaller or vector (SVG) logo.'));
        return;
      }
      resolve(result);
    };
    reader.readAsDataURL(file);
  });
}

/** True when a value is an uploaded data URL (vs. a pasted https URL). */
function isDataUrl(v: string | undefined): boolean {
  return !!v && v.startsWith('data:');
}

export function Branding() {
  const isAdmin = useCanPerform('admin');
  const { data, isLoading } = useTenantBranding(isAdmin);
  const update = useUpdateTenantBranding();
  const [form] = Form.useForm<FormShape>();
  const [preview, setPreview] = useState<FormShape>(EMPTY_FORM);

  useEffect(() => {
    if (!data) return;
    const next: FormShape = {
      brand_color: data.brand_color ?? '',
      display_name: data.display_name ?? '',
      logo_url: data.logo_url ?? '',
      logo_collapsed_url: data.logo_collapsed_url ?? '',
    };
    form.setFieldsValue(next);
    setPreview(next);
  }, [data, form]);

  if (!isAdmin) {
    return <Alert type="warning" showIcon message="Branding settings are admin-only." />;
  }

  if (isLoading) return <Spin />;

  const onValuesChange = (_changed: unknown, all: FormShape) => {
    setPreview(all);
  };

  // Set a logo field from an uploaded file. Returns false from antd Upload's
  // beforeUpload so it never performs a network upload.
  const handleUpload = (field: LogoField) => (file: File) => {
    readLogoFile(file)
      .then((dataUrl) => {
        form.setFieldValue(field, dataUrl);
        setPreview((prev) => ({ ...prev, [field]: dataUrl }));
        message.success('Logo loaded — Save to apply.');
      })
      .catch((err: Error) => message.error(err.message));
    return false;
  };

  const clearLogo = (field: LogoField) => {
    form.setFieldValue(field, '');
    setPreview((prev) => ({ ...prev, [field]: '' }));
  };

  const onSubmit = async (values: FormShape) => {
    // PATCH semantics: empty string ⇒ clear override (null).
    const payload: TenantBrandingUpdate = {
      brand_color: values.brand_color?.trim() || null,
      display_name: values.display_name?.trim() || null,
      logo_url: values.logo_url?.trim() || null,
      logo_collapsed_url: values.logo_collapsed_url?.trim() || null,
    };
    try {
      await update.mutateAsync(payload);
      message.success('Branding updated');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const previewColor = preview.brand_color?.trim() || DEFAULT_BRAND_COLOR;
  const previewName = preview.display_name?.trim() || 'TagPulse';
  const previewFull = preview.logo_url?.trim();
  // Collapsed preview falls back to the full logo, then a monogram.
  const previewCollapsed = preview.logo_collapsed_url?.trim() || previewFull;
  const monogram = previewName.charAt(0).toUpperCase();

  const renderLogoField = (field: LogoField, label: string, extra: string) => {
    const value = field === 'logo_url' ? preview.logo_url : preview.logo_collapsed_url;
    return (
      <Form.Item label={label} extra={extra}>
        <Space align="start" wrap>
          <Upload accept={ACCEPT_ATTR} showUploadList={false} beforeUpload={handleUpload(field)}>
            <Button icon={<UploadOutlined />} data-testid={`branding-upload-btn-${field}`}>
              Upload image
            </Button>
          </Upload>
          {value?.trim() && (
            <>
              <img
                src={value}
                alt={`${label} preview`}
                style={{ height: 32, border: '1px solid var(--color-border)', borderRadius: 4, padding: 2 }}
                onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                data-testid={`branding-thumb-${field}`}
              />
              <Button
                size="small"
                onClick={() => clearLogo(field)}
                data-testid={`branding-clear-${field}`}
              >
                Clear
              </Button>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {isDataUrl(value) ? 'Uploaded image' : 'Linked URL'}
              </Text>
            </>
          )}
        </Space>
        {/* Advanced: paste an https:// URL instead of uploading. The field still
            holds whichever value (data URL or https URL) is current. */}
        <Form.Item name={field} noStyle>
          <Input
            placeholder="…or paste an https:// URL"
            allowClear
            style={{ marginTop: 8 }}
            data-testid={`branding-input-${field}`}
          />
        </Form.Item>
      </Form.Item>
    );
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={3}>Branding</Title>
      <Text type="secondary">
        Customize your tenant&apos;s display name, logos, and primary brand colour. Changes apply
        across the UI for everyone in your tenant.
      </Text>

      <Card>
        <Form<FormShape>
          form={form}
          layout="vertical"
          onValuesChange={onValuesChange}
          onFinish={onSubmit}
          initialValues={EMPTY_FORM}
        >
          <Form.Item
            name="display_name"
            label="Display name"
            extra="Overrides the tenant name in the Sider header and login page. Leave empty to use the default."
          >
            <Input placeholder="Acme Logistics" maxLength={120} allowClear />
          </Form.Item>

          {renderLogoField(
            'logo_url',
            'Full logo (expanded menu)',
            'Shown in the 240px sidebar header. A landscape wordmark works best — about 200×32 px, or an SVG.',
          )}

          {renderLogoField(
            'logo_collapsed_url',
            'Collapsed logo (icon)',
            'Shown on the 64px collapsed rail. A square icon/monogram works best — about 32×32 px, or an SVG. Falls back to the full logo, then a letter monogram.',
          )}

          <Form.Item
            name="brand_color"
            label="Brand colour (#RRGGBB)"
            rules={[
              {
                pattern: /^(#[0-9a-fA-F]{6})?$/,
                message: `Must be a 6-digit hex like ${DEFAULT_BRAND_COLOR}`,
              },
            ]}
            extra={`Defaults to ${DEFAULT_BRAND_COLOR} when empty.`}
          >
            <Input
              placeholder={DEFAULT_BRAND_COLOR}
              maxLength={7}
              allowClear
              data-testid="branding-color"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={update.isPending}>
              Save
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Preview">
        <Space size="large" align="center" wrap>
          {/* Expanded sidebar header */}
          <div
            style={{
              background: previewColor,
              color: '#fff', // audit-ignore: contrast colour for arbitrary brand background
              padding: 16,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: 240,
            }}
            data-testid="branding-preview"
          >
            {previewFull ? (
              <img
                src={previewFull}
                alt="Full logo"
                style={{ height: 32, maxWidth: 180 }}
                onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
              />
            ) : (
              <Text strong style={{ color: '#fff', fontSize: 18 }}>{/* audit-ignore: contrast colour for arbitrary brand background */}
                {previewName}
              </Text>
            )}
          </div>

          {/* Collapsed rail */}
          <div
            style={{
              background: previewColor,
              color: '#fff', // audit-ignore: contrast colour for arbitrary brand background
              padding: 12,
              borderRadius: 6,
              width: 64,
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            data-testid="branding-preview-collapsed"
          >
            {previewCollapsed ? (
              <img
                src={previewCollapsed}
                alt="Collapsed logo"
                style={{ width: 32, height: 32, objectFit: 'contain' }}
                onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
              />
            ) : (
              <Text strong style={{ color: '#fff', fontSize: 22 }}>{/* audit-ignore: contrast colour for arbitrary brand background */}
                {monogram}
              </Text>
            )}
          </div>
        </Space>
      </Card>
    </Space>
  );
}

export default Branding;
