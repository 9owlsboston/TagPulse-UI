// Sprint 38 row 3.9c — Asset Detail Events Log tab.
//
// Renders the synthesised lifecycle stream from `buildAssetEvents()` as a
// table. Kept in components/ (not pages/) because it's a presentational
// component that takes its data via props — AssetDetail already fetches the
// inputs (asset row + bindings + external positions) for other tabs.

import { useMemo } from 'react';
import Empty from 'antd/es/empty';
import Table from 'antd/es/table';
import Tag from 'antd/es/tag';
import Typography from 'antd/es/typography';
import type { AssetResponse } from '@/api/generated/models/AssetResponse';
import type { AssetTagBindingResponse } from '@/api/generated/models/AssetTagBindingResponse';
import type { ExternalLocationResponse } from '@/api/generated/models/ExternalLocationResponse';
import {
  buildAssetEvents,
  type AssetEvent,
  type AssetEventKind,
} from '@/lib/assetEvents';

const { Text } = Typography;

const KIND_LABEL: Record<AssetEventKind, string> = {
  created: 'Created',
  updated: 'Updated',
  retired: 'Retired',
  bound: 'Bound',
  unbound: 'Unbound',
  external_position: 'External Position',
};

const KIND_COLOR: Record<AssetEventKind, string> = {
  created: 'green',
  updated: 'blue',
  retired: 'red',
  bound: 'cyan',
  unbound: 'orange',
  external_position: 'purple',
};

export interface AssetEventsTabProps {
  asset: AssetResponse;
  bindings: AssetTagBindingResponse[] | undefined;
  externalPositions: ExternalLocationResponse[] | undefined;
}

export function AssetEventsTab({
  asset,
  bindings,
  externalPositions,
}: AssetEventsTabProps) {
  const events = useMemo(
    () => buildAssetEvents(asset, bindings, externalPositions),
    [asset, bindings, externalPositions],
  );

  return (
    <>
      <Text type="secondary">
        Lifecycle events for this asset: created / updated / retired plus
        every bind / unbind and any external position fix. Raw RFID reader
        hops live on the Reads tab to keep this stream focused on
        events an operator would want to audit.
      </Text>
      <Table<AssetEvent>
        style={{ marginTop: 12 }}
        rowKey="key"
        dataSource={events}
        pagination={{ pageSize: 25, showSizeChanger: false }}
        locale={{
          emptyText: (
            <Empty
              description="No events yet"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
        columns={[
          {
            title: 'When',
            dataIndex: 'at',
            width: 200,
            render: (v: string) => new Date(v).toLocaleString(),
          },
          {
            title: 'Type',
            dataIndex: 'kind',
            width: 180,
            render: (k: AssetEventKind) => (
              <Tag color={KIND_COLOR[k]}>{KIND_LABEL[k]}</Tag>
            ),
          },
          {
            title: 'Summary',
            dataIndex: 'summary',
          },
        ]}
      />
    </>
  );
}
