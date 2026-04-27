import { useState, useMemo } from 'react';
import { Col, Row, Typography, List, Tag, Spin, Statistic } from 'antd';
import {
  HddOutlined,
  ReadOutlined,
  AlertOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { KpiTile } from '@/components/KpiTile';
import { DeviceHealthCard } from '@/components/DeviceHealthCard';
import { useDevices } from '@/hooks/useDevices';
import { useReadsPerHour } from '@/hooks/useTagReads';
import { useAlerts } from '@/hooks/useAlerts';
import { useDeviceHealthList } from '@/hooks/useDeviceHealth';
import { useReadFrequency } from '@/hooks/useAnalytics';
import { useSSE } from '@/lib/sse';

const { Title } = Typography;
const ResponsiveGridLayout = WidthProvider(Responsive);

const DEFAULT_LAYOUTS = {
  lg: [
    { i: 'kpi-devices', x: 0, y: 0, w: 3, h: 2 },
    { i: 'kpi-reads', x: 3, y: 0, w: 3, h: 2 },
    { i: 'kpi-alerts', x: 6, y: 0, w: 3, h: 2 },
    { i: 'kpi-anomalies', x: 9, y: 0, w: 3, h: 2 },
    { i: 'recent-alerts', x: 0, y: 2, w: 6, h: 5 },
    { i: 'device-health', x: 6, y: 2, w: 6, h: 5 },
    { i: 'live-counter', x: 0, y: 7, w: 12, h: 2 },
  ],
};

const SSE_EVENTS = ['tag_read.created', 'alert.triggered'];
const SSE_QUERY_KEYS = [['tag-reads'], ['alerts'], ['device-health']];

export function Dashboard() {
  const devicesQuery = useDevices();
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);
  const readsPerHourQuery = useReadsPerHour({ start: todayStart });
  const alertsQuery = useAlerts({ status: 'open', limit: 5 });
  const healthQuery = useDeviceHealthList('active');
  const anomalyQuery = useReadFrequency({ metric: 'anomaly_count', limit: 1 });
  const [liveCount, setLiveCount] = useState(0);

  useSSE(SSE_EVENTS, SSE_QUERY_KEYS, () => setLiveCount((c) => c + 1));

  const loading = devicesQuery.isLoading || readsPerHourQuery.isLoading;

  const deviceCount = devicesQuery.data?.length ?? 0;
  const readsToday = useMemo(
    () => readsPerHourQuery.data?.reduce((sum, r) => sum + r.read_count, 0) ?? 0,
    [readsPerHourQuery.data],
  );
  const openAlerts = alertsQuery.data?.length ?? 0;
  const anomalies = useMemo(
    () => anomalyQuery.data?.reduce((sum, r) => sum + r.metric_value, 0) ?? 0,
    [anomalyQuery.data],
  );

  return (
    <div>
      <Title level={2}>TagPulse Dashboard</Title>
      <ResponsiveGridLayout
        className="layout"
        layouts={DEFAULT_LAYOUTS}
        breakpoints={{ lg: 996, md: 768, sm: 480 }}
        cols={{ lg: 12, md: 6, sm: 1 }}
        rowHeight={60}
        isDraggable
        isResizable
      >
        <div key="kpi-devices">
          <KpiTile title="Total Devices" value={deviceCount} prefix={<HddOutlined />} loading={loading} />
        </div>
        <div key="kpi-reads">
          <KpiTile title="Reads Today" value={readsToday} prefix={<ReadOutlined />} loading={loading} />
        </div>
        <div key="kpi-alerts">
          <KpiTile title="Open Alerts" value={openAlerts} prefix={<AlertOutlined />} loading={loading} />
        </div>
        <div key="kpi-anomalies">
          <KpiTile title="Anomalies" value={anomalies} prefix={<WarningOutlined />} loading={loading} />
        </div>
        <div key="recent-alerts" style={{ overflow: 'auto' }}>
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
        </div>
        <div key="device-health" style={{ overflow: 'auto' }}>
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
        </div>
        <div key="live-counter">
          <Statistic title="Live Tag Reads (this session)" value={liveCount} prefix={<ReadOutlined />} />
        </div>
      </ResponsiveGridLayout>
    </div>
  );
}
