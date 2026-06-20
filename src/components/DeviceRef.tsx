import { Link } from 'react-router-dom';
import Tooltip from 'antd/es/tooltip';

interface DeviceRefProps {
  /** The device (reader) id — the stable identity, used for the link + tooltip. */
  id: string;
  /** Human-friendly device name. Not unique across devices, so it's only a label. */
  name?: string | null;
}

/**
 * Shared reference to a device (reader). Renders the device **name** as a link
 * to its detail page, with the **`device_id` in a tooltip** for disambiguation.
 *
 * Device names are not unique (two readers can both be "reader-06"), so the
 * name is only a label — identity stays the `device_id` (which the link and
 * tooltip carry). Falls back to a short id (`device:xxxxxxxx`) when the name is
 * unknown (e.g. a deleted/unregistered device not in the current device list).
 */
export function DeviceRef({ id, name }: DeviceRefProps) {
  const label = name?.trim() ? name : `device:${id.slice(0, 8)}`;
  return (
    <Tooltip title={id}>
      <Link to={`/devices/${id}`}>{label}</Link>
    </Tooltip>
  );
}
