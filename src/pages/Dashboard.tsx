import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { resolveEndpointDisplay } from '@/utils/endpoints';
import { formatDate, formatLatency, formatNumber } from '@/utils/format';

export default function Dashboard() {
  const [info, setInfo] = useState<BrokerInfo | null>(null);
  const [summary, setSummary] = useState<BrokerSummary | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [controller, setController] = useState<ControllerStatus | null>(null);
  const [metadata, setMetadata] = useState<ClusterMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const [metricsSnapshot, setMetricsSnapshot] = useState<MetricsSnapshot | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const envApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  const envMetrics = (import.meta.env.VITE_METRICS_URL as string | undefined)?.trim();
  const baseLabel = envApiBase ? envApiBase.replace(/\/$/, '') : 'relative /api';
  const metricsURL = envMetrics || `${envApiBase ? baseLabel : ''}/metrics`;

  const loadDashboard = useCallback(async () => {
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
      setLastUpdated(Date.now());
    } catch (err) {
      console.error('Failed to load dashboard data', err);
      setLoadError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMetricsSnapshot = useCallback(async () => {
    try {
      const data = await fetchMetrics();
      setMetricsSnapshot(data);
      setMetricsError(null);
    } catch (err) {
      setMetricsError((err as Error).message);
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    const id = window.setInterval(loadDashboard, 10_000);
    return () => window.clearInterval(id);
  }, [loadDashboard]);

  useEffect(() => {
    loadMetricsSnapshot();
    const id = window.setInterval(loadMetricsSnapshot, 5_000);
    return () => window.clearInterval(id);
  }, [loadMetricsSnapshot]);

  const partitions = metadata?.partitions ?? [];
  const topicCount = partitions.length
    ? new Set(partitions.map((p) => p.topic)).size
    : 0;
  const leaderIds = Array.from(new Set(partitions.map((p) => p.leader))).sort(
    (a, b) => a - b,
  );
  const avgReplicas =
    partitions.length > 0
      ? partitions.reduce((sum, partition) => sum + (partition.replicas?.length ?? 0), 0) /
        partitions.length
      : undefined;
  const syncedPartitions = partitions.length
    ? partitions.filter((p) => (p.isr?.length ?? 0) === (p.replicas?.length ?? 0)).length
    : 0;
  const inSyncPercent =
    partitions.length > 0 ? Math.round((syncedPartitions / partitions.length) * 100) : undefined;
  const producePercentiles = metricsSnapshot
    ? latencyPercentiles(metricsSnapshot.produceLatency)
    : null;
  const fetchPercentiles = metricsSnapshot
    ? latencyPercentiles(metricsSnapshot.fetchLatency)
    : null;

  const endpointDisplay = useMemo(() => {
    if (!info) return null;
    return {
      binary: resolveEndpointDisplay(info.binaryEndpoint, 'tcp'),
      mqtt: resolveEndpointDisplay(info.mqttEndpoint, 'mqtt'),
      http: resolveEndpointDisplay(info.httpEndpoint, 'http'),
    };
  }, [info]);

  if (loading) return <p className="muted">Loading dashboard...</p>;

  return (
    <div className="layout-grid" style={{ gap: 18 }}>
      <div className="topbar" style={{ marginBottom: 0 }}>
        <div>
          <h3 style={{ margin: '0 0 4px' }}>Preview dashboard</h3>
          <p className="muted" style={{ margin: 0 }}>
            Core single-node status, broker endpoints, cluster metadata, and live metrics.
          </p>
        </div>
        <div className="actions">
          {lastUpdated && <span className="tag">Updated {formatDate(lastUpdated)}</span>}
          <button className="button secondary" onClick={() => void loadDashboard()}>
            Refresh
          </button>
        </div>
      </div>

      {loadError && (
        <div className="card">
          <p className="error-text" style={{ margin: 0 }}>
            Failed to refresh broker snapshot: {loadError}
          </p>
        </div>
      )}

      <div
        className="layout-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
          gap: 12,
        }}
      >
        <Card
          title="Broker"
          value={info?.id ?? 'wave-node'}
          subtitle={
            endpointDisplay ? (
              <div className="endpoint-list">
                <EndpointRow label="Binary" value={endpointDisplay.binary.label} />
                <EndpointRow label="MQTT" value={endpointDisplay.mqtt.label} />
                <EndpointRow
                  label="HTTP"
                  value={endpointDisplay.http.url ?? endpointDisplay.http.label}
                  href={endpointDisplay.http.url}
                />
                <div>
                  Cluster: {info?.clusterID ?? 'n/a'}; controller: {info?.controllerMode ?? 'single'}
                </div>
              </div>
            ) : (
              '-'
            )
          }
          footer={
            <div className="actions">
              <StatusPill status="up" label="Healthy" />
              {endpointDisplay?.http.derivedFromBrowserHost && (
                <span className="tag">HTTP resolved via browser host</span>
              )}
            </div>
          }
        />
        <Card
          title="Controller"
          subtitle={
            controller ? (
              <span className="muted">
                mode: {controller.mode}, state: {controller.raftState}, term: {controller.term}
              </span>
            ) : (
              <span className="muted">Controller endpoint unavailable</span>
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
          title="API / Metrics"
          subtitle={
            <div className="endpoint-list">
              <EndpointRow label="API base" value={baseLabel} />
              <EndpointRow label="Metrics" value={metricsURL} href={metricsURL} />
            </div>
          }
          footer={<span className="tag">Preview surface</span>}
        />
      </div>

      <div
        className="layout-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
          gap: 12,
        }}
      >
        <Card title="Topics" value={summary ? summary.topics : '-'} subtitle="Total topics" />
        <Card
          title="Partitions"
          value={summary ? summary.partitions : '-'}
          subtitle="Total partitions"
        />
        <Card
          title="Messages produced"
          value={summary ? formatNumber(summary.produced) : '-'}
          subtitle="wavemq_messages_produced_total"
        />
        <Card
          title="Messages consumed"
          value={summary ? formatNumber(summary.consumed) : '-'}
          subtitle="wavemq_messages_consumed_total"
        />
        <Card
          title="Request errors"
          value={summary ? summary.errors : '-'}
          subtitle="wavemq_request_errors_total"
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
          <span className="tag">{metadata ? 'Cluster metadata available' : 'Single-node metadata'}</span>
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
            <div className="value">{metadata ? leaderIds.length : '-'}</div>
            <p className="muted" style={{ margin: 0, fontSize: 12, wordBreak: 'break-all' }}>
              {metadata ? leaderIds.join(', ') || 'n/a' : 'not available'}
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

      <div className="card">
        <div className="topbar" style={{ marginBottom: 10 }}>
          <div>
            <h3 style={{ margin: 0 }}>Prometheus metrics</h3>
            <p className="muted" style={{ margin: 0 }}>
              /metrics
            </p>
          </div>
          <div className="actions">
            {metricsSnapshot && (
              <span className="tag">Updated {formatDate(metricsSnapshot.timestamp)}</span>
            )}
            <button className="button secondary" onClick={() => void loadMetricsSnapshot()}>
              Refresh metrics
            </button>
          </div>
        </div>

        {metricsError ? (
          <p className="error-text" style={{ margin: 0 }}>
            Failed to load metrics: {metricsError}
          </p>
        ) : metricsLoading && !metricsSnapshot ? (
          <p className="muted">Loading metrics snapshot...</p>
        ) : metricsSnapshot ? (
          <>
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
                <div className="value">{formatNumber(total(metricsSnapshot.producedTotal))}</div>
                <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                  wavemq_messages_produced_total
                </p>
              </div>
              <div className="stat-item">
                <div className="label">Consumed total</div>
                <div className="value">{formatNumber(total(metricsSnapshot.consumedTotal))}</div>
                <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                  wavemq_messages_consumed_total
                </p>
              </div>
              <div className="stat-item">
                <div className="label">Request errors</div>
                <div className="value">{metricsSnapshot.requestErrorsTotal}</div>
                <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                  wavemq_request_errors_total
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
          </>
        ) : (
          <p className="muted">Metrics are not available yet.</p>
        )}
      </div>

      <div className="card">
        <div className="topbar" style={{ marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>Topics</h3>
          <Link to="/topics" className="tag">
            view all
          </Link>
        </div>
        {topics.length ? (
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
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            No topics created yet.
          </p>
        )}
      </div>
    </div>
  );
}

function total(values: Record<string, number>) {
  return Object.values(values).reduce((acc, value) => acc + value, 0);
}

function EndpointRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div>
      <span className="muted">{label}: </span>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="endpoint-link">
          {value}
        </a>
      ) : (
        <span className="endpoint-text">{value}</span>
      )}
    </div>
  );
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
          <div key={key} className="stat-item">
            <div className="label">{key.toUpperCase()}</div>
            <div className="value">{formatLatency(value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
