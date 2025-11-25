import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusPill from '@/components/StatusPill';
import Card from '@/components/Card';
import {
  fetchBrokerInfo,
  fetchBrokerSummary,
  fetchControllerStatus,
  fetchTopics,
} from '@/api/brokerApi';
import type { BrokerInfo, BrokerSummary, ControllerStatus, Topic } from '@/types';
import { formatNumber } from '@/utils/format';

export default function Dashboard() {
  const [info, setInfo] = useState<BrokerInfo | null>(null);
  const [summary, setSummary] = useState<BrokerSummary | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [controller, setController] = useState<ControllerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const metricsURL =
    (import.meta.env.VITE_METRICS_URL as string | undefined) ??
    `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8090'}/metrics`;

  useEffect(() => {
    async function load() {
      try {
        const [infoResp, summaryResp, topicsResp, controllerResp] = await Promise.all([
          fetchBrokerInfo(),
          fetchBrokerSummary(),
          fetchTopics(),
          fetchControllerStatus().catch((err) => {
            console.warn('Controller status unavailable', err);
            return null;
          }),
        ]);
        setInfo(infoResp);
        setSummary(summaryResp);
        setTopics(topicsResp);
        setController(controllerResp);
        setLoadError(null);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
        setLoadError('Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <p className="muted">Loading...</p>;
  if (loadError) return <p className="muted">Failed to load dashboard</p>;

  return (
    <div className="layout-grid" style={{ gap: 18 }}>
      <div
        className="layout-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}
      >
        <Card
          title="Broker"
          subtitle={
            info ? (
              <div>
                <div>Binary: {info.binaryEndpoint}</div>
                <div>MQTT: {info.mqttEndpoint}</div>
                <div>HTTP: {info.httpEndpoint}</div>
                <div>
                  Cluster: {info.clusterID ?? 'n/a'}; controller: {info.controllerMode ?? 'single'}
                </div>
              </div>
            ) : (
              '-'
            )
          }
          value={info?.id ?? 'wave-node'}
          footer={<StatusPill status="up" label="Healthy" />}
        />
        <Card
          title="Controller"
          subtitle={
            controller ? (
              <span className="muted">
                mode: {controller.mode}, state: {controller.raftState}, term: {controller.term}
              </span>
            ) : (
              <span className="muted">Not available</span>
            )
          }
          value={controller?.clusterID ?? info?.clusterID ?? info?.id ?? 'cluster'}
          footer={
            controller ? (
              controller.peers && controller.peers.length ? (
                <span className="tag">{controller.peers.length} peers</span>
              ) : (
                <span className="tag">single</span>
              )
            ) : (
              <span className="tag">unknown</span>
            )
          }
        />
        <Card
          title="Health / Metrics"
          subtitle={<span className="muted">Prometheus endpoint</span>}
          value={<a href={metricsURL}>/metrics</a>}
          footer={
            <a href={metricsURL} className="tag">
              Open metrics
            </a>
          }
        />
      </div>

      <div className="layout-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        <Card title="Topics" value={summary ? summary.topics : '-'} subtitle="Total topics" />
        <Card title="Partitions" value={summary ? summary.partitions : '-'} subtitle="Total partitions" />
        <Card
          title="Messages produced"
          value={summary ? formatNumber(summary.produced) : '-'}
          subtitle="messages_produced_total"
        />
        <Card
          title="Messages consumed"
          value={summary ? formatNumber(summary.consumed) : '-'}
          subtitle="messages_consumed_total"
        />
        <Card
          title="Request errors"
          value={summary ? summary.errors : '-'}
          subtitle="request_errors_total"
        />
      </div>

      <div className="card">
        <div className="topbar" style={{ marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>Topics</h3>
          <Link to="/topics" className="tag">
            view all
          </Link>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Topic</th>
              <th>Partitions</th>
              <th>Replication</th>
            </tr>
          </thead>
          <tbody>
            {topics.map((topic) => (
              <tr key={topic.name}>
                <td>
                  <Link to={`/topics/${topic.name}`}>{topic.name}</Link>
                </td>
                <td>{topic.partitions}</td>
                <td>x{topic.replicationFactor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
