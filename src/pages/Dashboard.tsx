import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusPill from '@/components/StatusPill';
import Card from '@/components/Card';
import {
  fetchBrokerInfo,
  fetchBrokerSummary,
  fetchControllerStatus,
  fetchClusterMetadata,
  fetchTopics,
} from '@/api/brokerApi';
import { fetchMetrics, latencyPercentiles } from '@/api/metricsApi';
import type {
  BrokerInfo,
  BrokerSummary,
  ControllerStatus,
  Topic,
  ClusterMetadata,
  MetricsSnapshot,
  LatencyPercentiles,
} from '@/types';
import { formatLatency, formatNumber } from '@/utils/format';

export default function Dashboard() {
  const [info, setInfo] = useState<BrokerInfo | null>(null);
  const [summary, setSummary] = useState<BrokerSummary | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [controller, setController] = useState<ControllerStatus | null>(null);
  const [metadata, setMetadata] = useState<ClusterMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [metricsSnapshot, setMetricsSnapshot] = useState<MetricsSnapshot | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const envApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  const envMetrics = (import.meta.env.VITE_METRICS_URL as string | undefined)?.trim();
  const baseLabel = envApiBase ? envApiBase.replace(/\/$/, '') : '';
  const metricsURL = envMetrics || `${baseLabel}/metrics`;

  useEffect(() => {
    async function load() {
      try {
        const [infoResp, summaryResp, topicsResp, controllerResp, metadataResp] =
          await Promise.all([
            fetchBrokerInfo(),
            fetchBrokerSummary(),
            fetchTopics(),
            fetchControllerStatus().catch((err) => {
              console.warn('Controller status unavailable', err);
              return null;
            }),
            fetchClusterMetadata().catch((err) => {
              console.warn('Cluster metadata unavailable', err);
              return null;
            }),
          ]);
        setInfo(infoResp);
        setSummary(summaryResp);
        setTopics(topicsResp);
        setController(controllerResp);
        setMetadata(metadataResp);
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

  useEffect(() => {
    let active = true;
    async function loadMetrics() {
      try {
        const data = await fetchMetrics();
        if (!active) return;
        setMetricsSnapshot(data);
        setMetricsError(null);
      } catch (err) {
        if (!active) return;
        setMetricsError((err as Error).message);
      }
    }

    loadMetrics();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <p className="muted">Loading...</p>;
  if (loadError) return <p className="muted">Failed to load dashboard</p>;

  const partitions = metadata?.partitions ?? [];
  const topicCount = partitions.length
    ? new Set(partitions.map((p) => p.topic)).size
    : 0;
  const leaderIds = Array.from(new Set(partitions.map((p) => p.leader))).sort(
    (a, b) => a - b,
  );
  const leaderCount = leaderIds.length;
  const avgReplicas =
    partitions.length > 0
      ? partitions.reduce(
          (sum, partition) => sum + (partition.replicas?.length ?? 0),
          0,
        ) / partitions.length
      : undefined;
  const syncedPartitions = partitions.length
    ? partitions.filter(
        (p) => (p.isr?.length ?? 0) === (p.replicas?.length ?? 0),
      ).length
    : 0;
  const inSyncPercent =
    partitions.length > 0
      ? Math.round((syncedPartitions / partitions.length) * 100)
      : undefined;
  const leadersList =
    leaderIds.length > 0 ? leaderIds.join(', ') : 'n/a';
  const metadataTag = metadata
    ? 'Cluster metadata available'
    : 'Single-node metadata';
  const producePercentiles = metricsSnapshot
    ? latencyPercentiles(metricsSnapshot.produceLatency)
    : null;
  const fetchPercentiles = metricsSnapshot
    ? latencyPercentiles(metricsSnapshot.fetchLatency)
    : null;

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
          <div>
            <h3 style={{ margin: 0 }}>Cluster metadata</h3>
            <p className="muted" style={{ margin: 0 }}>
              /api/cluster
            </p>
          </div>
          <span className="tag">{metadataTag}</span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
            gap: 12,
          }}
        >
          <div className="stat-item">
            <div className="label">Topics</div>
            <div className="value">{metadata ? topicCount : '-'}</div>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              unique topics
            </p>
          </div>
          <div className="stat-item">
            <div className="label">Partitions</div>
            <div className="value">{metadata ? partitions.length : '-'}</div>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              assigned partitions
            </p>
          </div>
          <div className="stat-item">
            <div className="label">Leaders</div>
            <div className="value">{metadata ? leaderCount : '-'}</div>
            <p
              className="muted"
              style={{ margin: 0, fontSize: 12, wordBreak: 'break-all' }}
            >
              {metadata ? leadersList : 'not available'}
            </p>
          </div>
          <div className="stat-item">
            <div className="label">Avg replicas</div>
            <div className="value">
              {metadata && avgReplicas !== undefined ? avgReplicas.toFixed(1) : '-'}
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              per partition
            </p>
          </div>
          <div className="stat-item">
            <div className="label">ISR coverage</div>
            <div className="value">
              {metadata && inSyncPercent !== undefined ? `${inSyncPercent}%` : '-'}
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              {metadata ? `${syncedPartitions}/${partitions.length} in sync` : 'not available'}
            </p>
          </div>
        </div>
      </div>

      {metricsError ? (
        <p className="muted">Failed to load metrics: {metricsError}</p>
      ) : metricsSnapshot ? (
        <div className="card">
          <div className="topbar" style={{ marginBottom: 10 }}>
            <div>
              <h3 style={{ margin: 0 }}>Prometheus metrics</h3>
              <p className="muted" style={{ margin: 0 }}>
                /metrics
              </p>
            </div>
            <span className="tag">
              Updated {new Date(metricsSnapshot.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div className="stat-item">
              <div className="label">Produced total</div>
              <div className="value">
                {formatNumber(total(metricsSnapshot.producedTotal))}
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                messages_produced_total
              </p>
            </div>
            <div className="stat-item">
              <div className="label">Consumed total</div>
              <div className="value">
                {formatNumber(total(metricsSnapshot.consumedTotal))}
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                messages_consumed_total
              </p>
            </div>
            <div className="stat-item">
              <div className="label">Request errors</div>
              <div className="value">{metricsSnapshot.requestErrorsTotal}</div>
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                request_errors_total
              </p>
            </div>
          </div>
          <div className="layout-grid two" style={{ gap: 12 }}>
            {producePercentiles && (
              <LatencyPercentilePanel label="Produce latency" data={producePercentiles} />
            )}
            {fetchPercentiles && (
              <LatencyPercentilePanel label="Fetch latency" data={fetchPercentiles} />
            )}
          </div>
        </div>
      ) : (
        <p className="muted">Loading metrics snapshot...</p>
      )}

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
        <p className="muted" style={{ marginTop: 6 }}>
          Replica / ISR layout is displayed in more detail on the <Link to="/cluster">Cluster</Link>{' '}
          page and per-topic details.
        </p>
      </div>
    </div>
  );
}

function total(values: Record<string, number>) {
  return Object.values(values).reduce((acc, value) => acc + value, 0);
}

function LatencyPercentilePanel({
  label,
  data,
}: {
  label: string;
  data: LatencyPercentiles;
}) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'var(--card-2)',
      }}
    >
      <p className="muted" style={{ margin: '0 0 8px' }}>
        {label}
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(100px,1fr))',
          gap: 8,
        }}
      >
        {Object.entries(data).map(([key, value]) => (
          <div
            key={key}
            style={{
              padding: '8px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.02)',
            }}
          >
            <div className="label">{key.toUpperCase()}</div>
            <div className="value">{formatLatency(value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
