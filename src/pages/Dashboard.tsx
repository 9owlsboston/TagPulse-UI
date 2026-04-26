import { Col, Row, Typography, List, Tag, Spin } from 'antd';
import {
  HddOutlined,
  ReadOutlined,
  AlertOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { KpiTile } from '@/components/KpiTile';
import { DeviceHealthCard } from '@/components/DeviceHealthCard';
import { useDevices } from '@/hooks/useDevices';
import { useTagReads } from '@/hooks/useTagReads';
import { useAlerts } from '@/hooks/useAlerts';
import { useDeviceHealthList } from '@/hooks/useDeviceHealth';
import { useReadFrequency } from '@/hooks/useAnalytics';
import { REFETCH_INTERVAL } from '@/lib/constants';

const { Title } = Typography;

export function Dashboard() {
  const devicesQuery = useDevices();
  const tagReadsQuery = useTagReads({ limit: 1 });
  const alertsQuery = useAlerts({ status: 'open', limit: 5 });
  const healthQuery = useDeviceHealthList('active');
  const anomalyQuery = useReadFrequency({ metric: 'anomaly_count', limit: 1 });

  const loading = devicesQuery.isLoading || tagReadsQuery.isLoading;

  const deviceCount = devicesQuery.data?.length ?? 0;
  const readsToday = tagReadsQuery.data?.length ?? 0;
  const openAlerts = alertsQuery.data?.length ?? 0;
  const anomalies = anomalyQuery.data?.reduce((sum, r) => sum + r.metric_value, 0) ?? 0;

  return (
    <div>
      <Title level={2}>TagPulse Dashboard</Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <KpiTile title="Total Devices" value={deviceCount} prefix={<HddOutlined />} loading={loading} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiTile title="Reads Today" value={readsToday} prefix={<ReadOutlined />} loading={loading} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiTile title="Open Alerts" value={openAlerts} prefix={<AlertOutlined />} loading={loading} />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiTile title="Anomalies" value={anomalies} prefix={<WarningOutlined />} loading={loading} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Title level={4}>Recent Alerts</Title>
          {alertsQuery.isLoading ? (
            <Spin />
          ) : (
            <List
              dataSource={alertsQuery.data ?? []}
              locale={{ emptyText: 'No open alerts' }}
              renderItem={(alert) => (
                <List.Item>
                  <List.Item.Meta
                    title={alert.message}
                    description={new Date(alert.triggered_at).toLocaleString()}
                  />
                  <Tag color={alert.severity === 'critical' ? 'red' : 'orange'}>{alert.severity}</Tag>
                </List.Item>
              )}
            />
          )}
        </Col>
        <Col xs={24} lg={12}>
          <Title level={4}>Device Health</Title>
          {healthQuery.isLoading ? (
            <Spin />
          ) : (
            <Row gutter={[8, 8]}>
              {(healthQuery.data ?? []).map((d) => (
                <Col key={d.device_id}>
                  <DeviceHealthCard device={d} />
                </Col>
              ))}
            </Row>
          )}
        </Col>
      </Row>
    </div>
  );
}

// Re-export REFETCH_INTERVAL for Dashboard auto-refresh (used by hooks)
void REFETCH_INTERVAL;
