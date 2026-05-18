/**
 * LastUpdate — Sprint 33 QW4.
 *
 * Reusable widget that pages drop into their headers to show
 * "Updated 2m ago" alongside a refresh button. The relative label
 * re-renders every 30 seconds while the component is mounted.
 *
 * Both props are optional: omit `timestamp` to show a "Not yet loaded"
 * placeholder; omit `onRefresh` to hide the refresh button.
 */
import Button from 'antd/es/button';
import Space from 'antd/es/space';
import Tooltip from 'antd/es/tooltip';
import Typography from 'antd/es/typography';
import { ReloadOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';

const { Text } = Typography;

interface LastUpdateProps {
  timestamp?: Date | string | number | null;
  onRefresh?: () => void;
  loading?: boolean;
}

// eslint-disable-next-line react-refresh/only-export-components
export function formatRelative(now: number, then: number): string {
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export function LastUpdate({ timestamp, onRefresh, loading }: LastUpdateProps) {
  // `tick` re-renders the relative label so "2m ago" rolls forward
  // without callers having to re-render on a timer.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!timestamp) return;
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, [timestamp]);

  const tsMs = timestamp ? new Date(timestamp).getTime() : null;
  const valid = tsMs !== null && !Number.isNaN(tsMs);
  const label = valid ? `Updated ${formatRelative(Date.now(), tsMs)}` : 'Not yet loaded';
  const fullTs = valid ? new Date(tsMs).toLocaleString() : '';

  return (
    <Space size="small" data-testid="last-update">
      <Tooltip title={fullTs}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {label}
        </Text>
      </Tooltip>
      {onRefresh && (
        <Button
          size="small"
          type="text"
          icon={<ReloadOutlined spin={loading} />}
          onClick={onRefresh}
          aria-label="Refresh"
          data-testid="last-update-refresh"
        />
      )}
    </Space>
  );
}
