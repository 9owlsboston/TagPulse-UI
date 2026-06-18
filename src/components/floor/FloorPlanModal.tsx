/**
 * Floor plan modal (Sprint 64 Phase 1) — hosts the coordinate-system editor and
 * the floor placement canvas for a single site.
 */
import Modal from 'antd/es/modal';
import Space from 'antd/es/space';
import { CoordSystemEditor } from './CoordSystemEditor';
import { FloorPlacement } from './FloorPlacement';
import type { DeviceResponse } from '@/api/generated/models/DeviceResponse';
import type { SiteResponse } from '@/api/generated/models/SiteResponse';

export function FloorPlanModal({
  site,
  devices,
  open,
  onClose,
}: {
  site: SiteResponse | null;
  devices: DeviceResponse[];
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={820}
      destroyOnClose
      title={site ? `Floor plan — ${site.name}` : 'Floor plan'}
    >
      {site && (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <CoordSystemEditor site={site} />
          <FloorPlacement site={site} devices={devices} />
        </Space>
      )}
    </Modal>
  );
}
