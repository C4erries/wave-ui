import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  fetchMessages,
  fetchTopicDetails,
  fetchClusterMetadata,
  produceMessage,
} from '@/api/brokerApi';
import type {
  ClusterMetadata,
  Message,
  PartitionAssignment,
  ProduceResult,
  TopicDetails as TopicDetailsType,
} from '@/types';
import { formatDate } from '@/utils/format';

export default function TopicDetails() {
  const { name } = useParams<{ name: string }>();
  const [details, setDetails] = useState<TopicDetailsType | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedPartition, setSelectedPartition] = useState<number | null>(null);
  const [offset, setOffset] = useState<number | undefined>(undefined);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [produceKey, setProduceKey] = useState('');
  const [produceValue, setProduceValue] = useState('');
  const [produceLoading, setProduceLoading] = useState(false);
  const [produceError, setProduceError] = useState<string | null>(null);
  const [produceResult, setProduceResult] = useState<ProduceResult | null>(null);
  const [clusterMetadata, setClusterMetadata] = useState<ClusterMetadata | null>(null);

  useEffect(() => {
    if (!name) return;
    async function load(topic: string) {
      const data = await fetchTopicDetails(topic);
      setDetails(data);
      const firstPartition = data.partitions[0]?.id ?? null;
      setSelectedPartition(firstPartition);
      setOffset(
        data.partitions.find((p) => p.id === firstPartition)?.highWatermark,
      );
      if (firstPartition !== null) {
        const msgs = await fetchMessages(topic, {
          partition: firstPartition,
          limit,
        });
        setMessages(msgs);
      }
    }
    load(name).catch(console.error);
  }, [name, limit]);

  useEffect(() => {
    let active = true;
    async function loadClusterMetadata() {
      try {
        const data = await fetchClusterMetadata();
        if (!active) return;
        setClusterMetadata(data);
      } catch (err) {
        console.warn('Cluster metadata unavailable', err);
      }
    }
    loadClusterMetadata();
    return () => {
      active = false;
    };
  }, []);

  const partitions = details?.partitions ?? [];
  const prettyName = details?.name ?? name ?? 'topic';
  const partitionCount = details?.partitionCount ?? partitions.length;

  async function loadMessages() {
    if (!name || selectedPartition === null) return;
    setLoading(true);
    try {
      const msgs = await fetchMessages(name, {
        partition: selectedPartition,
        offset,
        limit,
      });
      setMessages(msgs);
    } finally {
      setLoading(false);
    }
  }

  async function handleProduce() {
    if (!name) return;
    setProduceError(null);
    setProduceResult(null);
    if (!produceValue.trim()) {
      setProduceError('Value is required');
      return;
    }
    if (!produceKey.trim()) {
      setProduceError('Key is required for hash routing');
      return;
    }
    setProduceLoading(true);
    try {
      const result = await produceMessage(name, {
        key: produceKey.trim(),
        value: produceValue,
      });
      setProduceResult(result);
      setProduceValue('');
      await loadMessages();
    } catch (err) {
      setProduceError((err as Error).message);
    } finally {
      setProduceLoading(false);
    }
  }

  const selectedPartitionInfo = useMemo(
    () => partitions.find((p) => p.id === selectedPartition),
    [partitions, selectedPartition],
  );

  const assignmentMap = useMemo(() => {
    if (!clusterMetadata || !details?.name) return {};
    return clusterMetadata.partitions.reduce<Record<number, PartitionAssignment>>(
      (acc, assignment) => {
        if (assignment.topic !== details.name) return acc;
        acc[assignment.partition] = assignment;
        return acc;
      },
      {},
    );
  }, [clusterMetadata, details?.name]);

  return (
    <div className="layout-grid" style={{ gap: 16 }}>
      <div className="topbar" style={{ marginBottom: 0 }}>
        <div>
          <h3 style={{ margin: '0 0 4px' }}>{prettyName}</h3>
          <p className="muted" style={{ margin: 0 }}>
            Partitions: {partitionCount}
          </p>
        </div>
        <Link to="/topics" className="tag">
          back to list
        </Link>
      </div>

      <div className="card">
        <h4 style={{ margin: '0 0 10px' }}>Partitions</h4>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Leader</th>
              <th>Replicas</th>
              <th>ISR</th>
              <th>HWM</th>
              <th>Start offset</th>
            </tr>
          </thead>
          <tbody>
            {partitions.map((p) => {
              const assignment = assignmentMap[p.id];
              const replicas = assignment?.replicas ?? [];
              const isr = assignment?.isr ?? [];
              const isDegraded =
                replicas.length > 0 && isr.length < replicas.length;
              const leaderLabel = assignment?.leader ?? p.leader;
              return (
                <tr
                  key={`${p.id}-${leaderLabel}`}
                  style={
                    isDegraded
                      ? { backgroundColor: 'rgba(255, 196, 0, 0.08)' }
                      : undefined
                  }
                >
                  <td>{p.id}</td>
                  <td>{leaderLabel}</td>
                  <td>{formatList(replicas)}</td>
                  <td>{formatList(isr)}</td>
                  <td>{p.highWatermark}</td>
                  <td>{p.startOffset}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="muted" style={{ marginTop: 6 }}>
          Replica sets and ISR membership come from <code>/api/cluster</code>, so you can easily
          check which brokers host each partition directly on this page.
        </p>
      </div>

      <div className="card">
        <div className="topbar" style={{ marginBottom: 10 }}>
          <div>
            <h4 style={{ margin: 0 }}>Message browser</h4>
            <p className="muted" style={{ margin: 0 }}>
              Pick a partition and offset to load recent messages
            </p>
          </div>
          <button className="button" onClick={loadMessages} disabled={loading}>
            {loading ? 'Loading...' : 'Load'}
          </button>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label className="muted">Partition</label>
            <select
              className="select"
              value={selectedPartition ?? ''}
              onChange={(e) => {
                const next = Number(e.target.value);
                setSelectedPartition(next);
                const target = partitions.find((p) => p.id === next);
                if (target) setOffset(target.highWatermark);
              }}
            >
              {partitions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="muted">Offset (&lt;=)</label>
            <input
              className="input"
              type="number"
              value={offset ?? ''}
              onChange={(e) => setOffset(Number(e.target.value))}
            />
          </div>
          <div className="form-field">
            <label className="muted">Limit</label>
            <input
              className="input"
              type="number"
              min={1}
              max={200}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="section">
          <h4 style={{ margin: '12px 0 6px' }}>Produce message</h4>
          <p className="muted" style={{ marginTop: 0 }}>
            Partition is selected automatically by key hash.
          </p>
          <div className="form-row">
            <div className="form-field">
              <label className="muted">Key (required)</label>
              <input
                className="input"
                value={produceKey}
                onChange={(e) => setProduceKey(e.target.value)}
                placeholder="sensor-1"
              />
            </div>
            <div className="form-field" style={{ flex: 1, minWidth: 240 }}>
              <label className="muted">Value</label>
              <textarea
                className="input"
                style={{ minHeight: 80 }}
                value={produceValue}
                onChange={(e) => setProduceValue(e.target.value)}
                placeholder='{"value": 42.0}'
              />
            </div>
            <button
              className="button"
              onClick={handleProduce}
              disabled={produceLoading}
              style={{ alignSelf: 'flex-end' }}
            >
              {produceLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
          {produceError && (
            <p className="muted" style={{ color: 'var(--danger)' }}>
              {produceError}
            </p>
          )}
          {produceResult && (
            <p className="muted" style={{ color: 'var(--accent)' }}>
              Sent to partition {produceResult.partition}, base offset {produceResult.baseOffset}.
            </p>
          )}
        </div>

        <div className="section">
          <h4 style={{ margin: '12px 0 6px' }}>
            Messages ({messages.length})
          </h4>
          {selectedPartitionInfo && (
            <p className="muted" style={{ marginTop: 0 }}>
              HWM: {selectedPartitionInfo.highWatermark}, Start:{' '}
              {selectedPartitionInfo.startOffset}
            </p>
          )}
          {messages.map((msg) => (
            <div key={`${msg.partition}-${msg.offset}`} className="message">
              <div className="meta">
                Partition {msg.partition} - Offset {msg.offset} -{' '}
                {formatDate(msg.timestamp)}
              </div>
              <pre>{prettyPrint(msg.value)}</pre>
            </div>
          ))}
          {!messages.length && <p className="muted">No data yet.</p>}
        </div>
      </div>
    </div>
  );
}

function prettyPrint(value: string) {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function formatList(values: number[] | null | undefined) {
  if (!values || !values.length) return '-';
  return values.join(', ');
}
