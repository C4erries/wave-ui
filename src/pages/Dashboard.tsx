import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusPill from '@/components/StatusPill';
import Card from '@/components/Card';
import { fetchBrokerInfo, fetchBrokerSummary, fetchTopics } from '@/api/brokerApi';
import type { BrokerInfo, BrokerSummary, Topic } from '@/types';
import { formatNumber } from '@/utils/format';

export default function Dashboard() {
  const [info, setInfo] = useState<BrokerInfo | null>(null);
  const [summary, setSummary] = useState<BrokerSummary | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  const metricsURL =
    (import.meta.env.VITE_METRICS_URL as string | undefined) ??
    `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8090'}/metrics`;

  useEffect(() => {
    async function load() {
      try {
        const [infoResp, summaryResp, topicsResp] = await Promise.all([
          fetchBrokerInfo(),
          fetchBrokerSummary(),
          fetchTopics(),
        ]);
        setInfo(infoResp);
        setSummary(summaryResp);
        setTopics(topicsResp);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <p className="muted">Loading...</p>;

  return (
    <div className="layout-grid" style={{ gap: 18 }}>
      <div className="layout-grid two">
        <Card
          title="Broker"
          subtitle={
            info ? (
              <div>
                <div>Binary: {info.binaryEndpoint}</div>
                <div>MQTT: {info.mqttEndpoint}</div>
                <div>HTTP: {info.httpEndpoint}</div>
              </div>
            ) : (
              '-'
            )
          }
          value={info?.id ?? 'wave-node'}
          footer={<StatusPill status="up" label="Healthy" />}
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
