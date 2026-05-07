/**
 * Lot detail page (Sprint 21).
 *
 * Shows the lot's product, code, manufacture/expiry dates, and a
 * Cold-chain card built from the embedded `latest_telemetry` (when the
 * tenant has `lot` opted in for subject-scoped telemetry). The Telemetry
 * tab reuses `<SubjectTelemetryTab subjectKind="lot" />`.
 */
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Spin, Tabs, Tag, Typography, Statistic, Space, Alert } from 'antd';
import { useLot, useProduct } from '@/hooks/useInventory';
import { SubjectTelemetryTab } from '@/components/SubjectTelemetryTab';
import { useTenantConfig } from '@/hooks/useTenantConfig';

const { Title, Text } = Typography;

const COLD_CHAIN_THRESHOLD_C = 8;

function ColdChainCard({ latest }: { latest: NonNullable<ReturnType<typeof useLot>['data']>['latest_telemetry'] }) {
  const temp = (latest ?? []).find((m) => m.metric_name === 'temperature_c');
  if (!temp) {
    return (
      <Card title="Cold-chain status" size="small">
        <Text type="secondary">No temperature readings yet for this lot.</Text>
      </Card>
    );
  }
  const breached = temp.metric_value > COLD_CHAIN_THRESHOLD_C;
  return (
    <Card
      title="Cold-chain status"
      size="small"
      extra={
        <Tag color={breached ? 'red' : 'green'}>
          {breached ? 'BREACH' : 'OK'}
        </Tag>
      }
    >
      <Space direction="vertical" size={8}>
        <Statistic
          title={`Latest temperature (threshold ${COLD_CHAIN_THRESHOLD_C} ${temp.unit ?? '°C'})`}
          value={temp.metric_value}
          precision={2}
          suffix={temp.unit ?? '°C'}
          valueStyle={{ color: breached ? '#cf1322' : '#3f8600' }}
        />
        <Text type="secondary">
          As of {new Date(temp.timestamp).toLocaleString()} · source: {temp.source}
        </Text>
        {breached && (
          <Alert
            type="error"
            showIcon
            message="Temperature above cold-chain threshold."
            description={`Configure a 'lot.cold_chain_breach' rule from the Rules → Templates gallery to alert on this condition automatically.`}
          />
        )}
      </Space>
    </Card>
  );
}

export function LotDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: lot, isLoading } = useLot(id);
  const { data: product } = useProduct(lot?.product_id ?? '');
  const { data: tenant } = useTenantConfig();
  const lotOptedIn = (tenant?.telemetry_subject_kinds ?? []).includes('lot');

  if (isLoading) return <Spin />;
  if (!lot || !id) return <Text type="secondary">Lot not found.</Text>;

  const tabItems = [
    {
      key: 'overview',
      label: 'Overview',
      children: (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Descriptions bordered column={2}>
            <Descriptions.Item label="Lot code">{lot.lot_code}</Descriptions.Item>
            <Descriptions.Item label="Product">
              {product ? (
                <a onClick={() => navigate(`/inventory/products/${lot.product_id}`)}>
                  {product.name}
                </a>
              ) : (
                lot.product_id
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Manufactured">
              {lot.manufactured_at ? new Date(lot.manufactured_at).toLocaleDateString() : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Expires">
              {lot.expires_at ? new Date(lot.expires_at).toLocaleDateString() : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Created">
              {new Date(lot.created_at).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Metadata" span={2}>
              <pre style={{ margin: 0 }}>
                {lot.metadata ? JSON.stringify(lot.metadata, null, 2) : '—'}
              </pre>
            </Descriptions.Item>
          </Descriptions>

          {lotOptedIn ? (
            <ColdChainCard latest={lot.latest_telemetry} />
          ) : (
            <Alert
              type="info"
              showIcon
              message="Cold-chain monitoring is not enabled."
              description="Ask an admin to enable subject-scoped telemetry for `lot` in Tenant Settings."
            />
          )}
        </Space>
      ),
    },
    {
      key: 'telemetry',
      label: 'Telemetry',
      children: (
        <SubjectTelemetryTab
          subjectKind="lot"
          subjectId={id}
          latest={lot.latest_telemetry}
        />
      ),
    },
  ];

  return (
    <div>
      <Title level={2}>Lot {lot.lot_code}</Title>
      <Tabs items={tabItems} />
    </div>
  );
}

export default LotDetail;
