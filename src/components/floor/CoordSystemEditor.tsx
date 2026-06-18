/**
 * Site coordinate-system editor (Sprint 64 Phase 1).
 *
 * Sets/clears a site's `coord_system` (units, extent, origin, rotation) via the
 * existing `PATCH /sites/{id}` path. `NULL` ⇒ geographic-only; set ⇒ the site
 * renders as a floor plan. The optional inline floorplan *image* is a deferred
 * follow-up (needs a backend `coord_system.floorplan_image` field) — Phase 1
 * uses the plain-grid fallback, sized by `extent_x × extent_y`.
 */
import { useState } from 'react';
import App from 'antd/es/app';
import Button from 'antd/es/button';
import Form from 'antd/es/form';
import InputNumber from 'antd/es/input-number';
import Select from 'antd/es/select';
import Space from 'antd/es/space';
import Typography from 'antd/es/typography';
import Upload from 'antd/es/upload';
import { UploadOutlined } from '@ant-design/icons';
import { useUpdateSite } from '@/hooks/useAssets';
import { CoordSystem } from '@/api/generated/models/CoordSystem';
import type { SiteResponse } from '@/api/generated/models/SiteResponse';

const { Text } = Typography;

// ~1.5 MB image ≈ 2 MB base64 (the backend cap). Reject earlier, client-side.
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

interface FormValues {
  units: CoordSystem.units;
  extent_x: number;
  extent_y: number;
  origin_anchor: CoordSystem.origin_anchor;
  rotation_deg: number;
}

const DEFAULTS: FormValues = {
  units: CoordSystem.units.METERS,
  extent_x: 600,
  extent_y: 400,
  origin_anchor: CoordSystem.origin_anchor.NW_CORNER,
  rotation_deg: 0,
};

export function CoordSystemEditor({ site }: { site: SiteResponse }) {
  const { message } = App.useApp();
  const updateSite = useUpdateSite();
  const [form] = Form.useForm<FormValues>();
  const existing = site.coord_system ?? null;
  const [hasFrame, setHasFrame] = useState<boolean>(existing != null);
  const [floorplanImage, setFloorplanImage] = useState<string | null>(
    existing?.floorplan_image ?? null,
  );

  const beforeUpload = (file: File): boolean => {
    if (file.size > MAX_IMAGE_BYTES) {
      message.error('Floorplan image too large (max ~1.5 MB)');
      return false;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setFloorplanImage(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
    return false; // never auto-upload — we store inline on save
  };

  const initialValues: FormValues = existing
    ? {
        units: existing.units ?? CoordSystem.units.METERS,
        extent_x: existing.extent_x,
        extent_y: existing.extent_y,
        origin_anchor: existing.origin_anchor ?? CoordSystem.origin_anchor.NW_CORNER,
        rotation_deg: existing.rotation_deg ?? 0,
      }
    : DEFAULTS;

  const handleSave = async (values: FormValues) => {
    const coord_system: CoordSystem = {
      units: values.units,
      extent_x: values.extent_x,
      extent_y: values.extent_y,
      origin_anchor: values.origin_anchor,
      rotation_deg: values.rotation_deg,
      floorplan_image: floorplanImage,
    };
    try {
      await updateSite.mutateAsync({ id: site.id, data: { coord_system } });
      setHasFrame(true);
      message.success('Floor coordinate system saved');
    } catch {
      message.error('Failed to save coordinate system');
    }
  };

  const handleClear = async () => {
    try {
      await updateSite.mutateAsync({ id: site.id, data: { coord_system: null } });
      setHasFrame(false);
      form.resetFields();
      message.success('Reverted to geographic-only');
    } catch {
      message.error('Failed to clear coordinate system');
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={handleSave}
      data-testid="coord-system-editor"
    >
      <Text type="secondary">
        Define a floor plan for this site. With no coordinate system the site
        stays on the geographic (lat/lon) map.
      </Text>
      <Space wrap align="end" style={{ marginTop: 12 }}>
        <Form.Item label="Units" name="units" style={{ marginBottom: 12 }}>
          <Select
            style={{ width: 120 }}
            options={[
              { label: 'Meters', value: CoordSystem.units.METERS },
              { label: 'Feet', value: CoordSystem.units.FEET },
            ]}
          />
        </Form.Item>
        <Form.Item
          label="Width (x)"
          name="extent_x"
          rules={[{ required: true, type: 'number', min: 0.0001, message: 'Width must be > 0' }]}
          style={{ marginBottom: 12 }}
        >
          <InputNumber min={0} style={{ width: 120 }} />
        </Form.Item>
        <Form.Item
          label="Height (y)"
          name="extent_y"
          rules={[{ required: true, type: 'number', min: 0.0001, message: 'Height must be > 0' }]}
          style={{ marginBottom: 12 }}
        >
          <InputNumber min={0} style={{ width: 120 }} />
        </Form.Item>
        <Form.Item label="Origin" name="origin_anchor" style={{ marginBottom: 12 }}>
          <Select
            style={{ width: 150 }}
            options={[
              { label: 'NW corner', value: CoordSystem.origin_anchor.NW_CORNER },
              { label: 'SW corner', value: CoordSystem.origin_anchor.SW_CORNER },
            ]}
          />
        </Form.Item>
        <Form.Item label="Rotation°" name="rotation_deg" style={{ marginBottom: 12 }}>
          <InputNumber min={-360} max={360} style={{ width: 100 }} />
        </Form.Item>
        <Form.Item label="Floorplan image" style={{ marginBottom: 12 }}>
          <Space>
            <Upload accept="image/*" showUploadList={false} beforeUpload={beforeUpload}>
              <Button icon={<UploadOutlined />} data-testid="coord-system-upload">
                {floorplanImage ? 'Replace' : 'Upload'}
              </Button>
            </Upload>
            {floorplanImage && (
              <Button
                onClick={() => setFloorplanImage(null)}
                data-testid="coord-system-remove-image"
              >
                Remove
              </Button>
            )}
          </Space>
        </Form.Item>
      </Space>
      <Space>
        <Button
          type="primary"
          htmlType="submit"
          loading={updateSite.isPending}
          data-testid="coord-system-save"
        >
          Save floor plan
        </Button>
        {hasFrame && (
          <Button
            danger
            onClick={handleClear}
            loading={updateSite.isPending}
            data-testid="coord-system-clear"
          >
            Make geographic-only
          </Button>
        )}
      </Space>
    </Form>
  );
}
