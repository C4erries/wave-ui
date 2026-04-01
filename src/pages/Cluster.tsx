import { useCallback, useEffect, useState } from 'react';
import Card from '@/components/Card';
import { fetchClusterMetadata, fetchControllerStatus } from '@/api/brokerApi';
import type { ClusterMetadata, ControllerStatus } from '@/types';
import { formatDate } from '@/utils/format';

export default function Cluster() {
  const [metadata, setMetadata] = useState<ClusterMetadata | null>(null);
  const [controller, setController] = useState<ControllerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [controllerResp, metadataResp] = await Promise.all([
        fetchControllerStatus().catch((err) => {
          console.warn('Controller status unavailable', err);
          return null;
        }),
        fetchClusterMetadata().catch((err) => {
          console.warn('Cluster metadata unavailable', err);
          return null;
        }),
      ]);
      setController(controllerResp);
      setMetadata(metadataResp);
      setError(!controllerResp && !metadataResp ? 'Cluster endpoints unavailable' : null);
      setLastUpdated(Date.now());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 10_000);
    return () => window.clearInterval(id);
  }, [load]);

  if (loading) return <p className="muted">Loading cluster...</p>;

  const peers = controller?.peers ?? [];

  return (
    <div className="layout-grid" style={{ gap: 16 }}>
      <div className="topbar" style={{ marginBottom: 0 }}>
        <div>
          <h3 style={{ margin: '0 0 4px' }}>Cluster</h3>
          <p className="muted" style={{ margin: 0 }}>
            Single-node preview today, but aligned with raft-style metadata endpoints.
          </p>
        </div>
        <div className="actions">
          {lastUpdated && <span className="tag">Updated {formatDate(lastUpdated)}</span>}
          <button className="button secondary" onClick={() => void load()}>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card">
          <p className="error-text" style={{ margin: 0 }}>
            {error}
          </p>
        </div>
      )}

      <div
        className="layout-grid"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}
      >
        <Card
          title="Cluster ID"
          value={metadata?.clusterID ?? controller?.clusterID ?? 'single'}
          subtitle={`version: ${metadata?.version ?? controller?.version ?? 'n/a'}`}
        />
        <Card
          title="Controller"
          value={controller?.raftState ?? 'unknown'}
          subtitle={`mode: ${controller?.mode ?? 'single'}, term: ${controller?.term ?? 0}`}
          footer={
            controller ? (
              peers.length ? <span className="tag">{peers.length} peers</span> : <span className="tag">single</span>
            ) : (
              <span className="tag">not available</span>
            )
          }
        />
        <Card
          title="Brokers"
          value={metadata?.brokers?.length ?? 1}
          subtitle="Registered brokers"
          footer={
            peers.length ? <span className="muted">{peers.map((p) => p.id).join(', ')}</span> : <span className="muted">No peers</span>
          }
        />
        <Card
          title="Partitions"
          value={metadata?.partitions?.length ?? '-'}
          subtitle="Total partitions in cluster"
        />
      </div>

      <div className="card">
        <div className="topbar" style={{ marginBottom: 10 }}>
          <h4 style={{ margin: 0 }}>Brokers</h4>
          <span className="muted">From /api/cluster</span>
        </div>
        {metadata?.brokers?.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>BrokerID</th>
                <th>Host</th>
                <th>Port</th>
                <th>Rack</th>
              </tr>
            </thead>
            <tbody>
              {metadata.brokers.map((b) => (
                <tr key={b.brokerID}>
                  <td>{b.brokerID}</td>
                  <td>{b.host}</td>
                  <td>{b.port}</td>
                  <td>{b.rack || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            No broker metadata available. This is normal for simple single-node snapshots.
          </p>
        )}
      </div>

      <div className="card">
        <div className="topbar" style={{ marginBottom: 10 }}>
          <h4 style={{ margin: 0 }}>Partitions</h4>
          <span className="muted">Leader / Replicas / ISR</span>
        </div>
        {metadata?.partitions?.length ? (
          <table className="table">
            <thead>
              <tr>
                <th>Topic</th>
                <th>Partition</th>
                <th>Leader</th>
                <th>Replicas</th>
                <th>ISR</th>
                <th>LeaderEpoch</th>
              </tr>
            </thead>
            <tbody>
              {metadata.partitions.map((p) => {
                const replicas = p.replicas ?? [];
                const isr = p.isr ?? [];
                const isDegraded = isr.length < replicas.length;
                return (
                  <tr
                    key={`${p.topic}-${p.partition}`}
                    style={isDegraded ? { backgroundColor: 'rgba(255, 196, 0, 0.08)' } : undefined}
                  >
                    <td>{p.topic}</td>
                    <td>{p.partition}</td>
                    <td>{p.leader}</td>
                    <td>{formatList(replicas)}</td>
                    <td>{formatList(isr)}</td>
                    <td>{p.leaderEpoch}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            No partition assignments available.
          </p>
        )}
      </div>
    </div>
  );
}

function formatList(values: number[] | null | undefined) {
  if (!values || !values.length) return '-';
  return values.join(', ');
}
