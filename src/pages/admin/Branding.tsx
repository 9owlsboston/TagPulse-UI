/**
 * Branding — Sprint 33 QW6.
 *
 * Admin-only page for editing per-tenant branding overrides
 * (`display_name`, `logo_url`, `brand_color`). Live preview re-renders
 * as the form changes so admins can see the Sider header before saving.
 *
 * Backend contract: `PATCH /tenant/branding` (TenantBrandingUpdate).
 * Each field is optional; an empty string clears the override.
 */
import { Alert, Button, Card, Form, Input, Space, Spin, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import { useCanPerform } from '@/components/useCanPerform';
import {
  useTenantBranding,
  useUpdateTenantBranding,
} from '@/hooks/useTenantBranding';
import { DEFAULT_BRAND_COLOR } from '@/theme/ThemeProvider';
import type { TenantBrandingUpdate } from '@/api/generated/models/TenantBrandingUpdate';

const { Title, Text } = Typography;

interface FormShape {
  brand_color: string;
  display_name: string;
  logo_url: string;
}

export function Branding() {
  const isAdmin = useCanPerform('admin');
  const { data, isLoading } = useTenantBranding(isAdmin);
  const update = useUpdateTenantBranding();
  const [form] = Form.useForm<FormShape>();
  const [preview, setPreview] = useState<FormShape>({
    brand_color: '',
    display_name: '',
    logo_url: '',
  });

  useEffect(() => {
    if (!data) return;
    const next: FormShape = {
      brand_color: data.brand_color ?? '',
      display_name: data.display_name ?? '',
      logo_url: data.logo_url ?? '',
    };
    form.setFieldsValue(next);
    setPreview(next);
  }, [data, form]);

  if (!isAdmin) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Branding settings are admin-only."
      />
    );
  }

  if (isLoading) return <Spin />;

  const onValuesChange = (_changed: unknown, all: FormShape) => {
    setPreview(all);
  };

  const onSubmit = async (values: FormShape) => {
    // PATCH semantics: empty string ⇒ clear override (null).
    const payload: TenantBrandingUpdate = {
      brand_color: values.brand_color?.trim() || null,
      display_name: values.display_name?.trim() || null,
      logo_url: values.logo_url?.trim() || null,
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
  const previewLogo = preview.logo_url?.trim();

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={3}>Branding</Title>
      <Text type="secondary">
        Customize your tenant&apos;s display name, logo, and primary brand colour.
        Changes apply across the UI for everyone in your tenant.
      </Text>

      <Card>
        <Form<FormShape>
          form={form}
          layout="vertical"
          onValuesChange={onValuesChange}
          onFinish={onSubmit}
          initialValues={{ brand_color: '', display_name: '', logo_url: '' }}
        >
          <Form.Item
            name="display_name"
            label="Display name"
            extra="Overrides the tenant name in the Sider header and login page. Leave empty to use the default."
          >
            <Input placeholder="Acme Logistics" maxLength={120} allowClear />
          </Form.Item>

          <Form.Item
            name="logo_url"
            label="Logo URL"
            rules={[{ type: 'url', message: 'Must be a valid URL' }]}
            extra="HTTPS URL to a logo image (SVG or PNG recommended)."
          >
            <Input
              placeholder="https://cdn.example.com/logo.svg"
              allowClear
              data-testid="branding-logo-url"
            />
          </Form.Item>

          <Form.Item
            name="brand_color"
            label="Brand colour (#RRGGBB)"
            rules={[
              {
                pattern: /^(#[0-9a-fA-F]{6})?$/,
                message: 'Must be a 6-digit hex like #0d9488',
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
        <div
          style={{
            background: previewColor,
            color: '#fff',
            padding: 16,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
          data-testid="branding-preview"
        >
          {previewLogo && (
            <img
              src={previewLogo}
              alt="Tenant logo"
              style={{
                height: 32,
                background: 'rgba(255,255,255,0.1)',
                padding: 4,
                borderRadius: 4,
              }}
              // Failed image loads shouldn't break the preview chrome.
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <Text strong style={{ color: '#fff', fontSize: 18 }}>
            {previewName}
          </Text>
        </div>
      </Card>
    </Space>
  );
}

export default Branding;
