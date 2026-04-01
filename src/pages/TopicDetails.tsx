import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  fetchMessages,
  fetchTopicDetails,
  fetchClusterMetadata,
  produceMessage,
  produceMessageToPartition,
} from '@/api/brokerApi';
import type {
  ClusterMetadata,
  PartitionAssignment,
  ProduceResult,
  TopicDetails as TopicDetailsType,
} from '@/types';
import { formatDate } from '@/utils/format';
import { inspectPayload } from '@/utils/payload';

type ProduceMode = 'partition' | 'hash';

export default function TopicDetails() {
  const { name } = useParams<{ name: string }>();
  const [details, setDetails] = useState<TopicDetailsType | null>(null);
  const [messages, setMessages] = useState<TopicDetailsMessage[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [selectedPartition, setSelectedPartition] = useState<number | null>(null);
  const [offsetInput, setOffsetInput] = useState('');
  const [limit, setLimit] = useState(20);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [produceMode, setProduceMode] = useState<ProduceMode>('partition');
  const [produceKey, setProduceKey] = useState('');
  const [produceValue, setProduceValue] = useState('');
  const [produceContentType, setProduceContentType] = useState('');
  const [produceLoading, setProduceLoading] = useState(false);
  const [produceError, setProduceError] = useState<string | null>(null);
  const [produceResult, setProduceResult] = useState<ProduceResult | null>(null);
  const [clusterMetadata, setClusterMetadata] = useState<ClusterMetadata | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const partitions = details?.partitions ?? [];
  const prettyName = details?.name ?? name ?? 'topic';
  const partitionCount = details?.partitionCount ?? partitions.length;

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

  const loadMessages = useCallback(async () => {
    if (!name || selectedPartition === null) return;
    setLoadingMessages(true);
    try {
      const offset =
        offsetInput.trim() === '' ? undefined : Number(offsetInput.trim());
      const msgs = await fetchMessages(name, {
        partition: selectedPartition,
        offset: Number.isFinite(offset) ? offset : undefined,
        limit,
      });
      setMessages(msgs);
    } finally {
      setLoadingMessages(false);
    }
  }, [limit, name, offsetInput, selectedPartition]);

  const loadPage = useCallback(async () => {
    if (!name) return;
    setPageLoading(true);
    try {
      const [topicDetails, metadata] = await Promise.all([
        fetchTopicDetails(name),
        fetchClusterMetadata().catch((err) => {
          console.warn('Cluster metadata unavailable', err);
          return null;
        }),
      ]);
      setDetails(topicDetails);
      setClusterMetadata(metadata);

      const firstPartition = topicDetails.partitions[0]?.id ?? null;
      setSelectedPartition((current) => current ?? firstPartition);

      const activePartition =
        topicDetails.partitions.find((p) => p.id === selectedPartition) ??
        topicDetails.partitions[0];
      if (activePartition) {
        setOffsetInput(String(activePartition.highWatermark));
        const msgs = await fetchMessages(name, {
          partition: activePartition.id,
          limit,
        });
        setMessages(msgs);
      } else {
        setMessages([]);
        setOffsetInput('');
      }

      setPageError(null);
      setLastUpdated(Date.now());
    } catch (err) {
      console.error('Failed to load topic details', err);
      setPageError((err as Error).message);
    } finally {
      setPageLoading(false);
    }
  }, [limit, name, selectedPartition]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  async function handleProduce() {
    if (!name) return;
    setProduceError(null);
    setProduceResult(null);

    if (!produceValue.trim()) {
      setProduceError('Value is required');
      return;
    }
    if (produceMode === 'hash' && !produceKey.trim()) {
      setProduceError('Key is required for hash routing');
      return;
    }
    if (produceMode === 'partition' && selectedPartition === null) {
      setProduceError('Select a partition first');
      return;
    }

    setProduceLoading(true);
    try {
      const payload = {
        key: produceKey.trim() || undefined,
        value: produceValue,
        contentType: produceContentType.trim() || undefined,
      };
      const result =
        produceMode === 'partition' && selectedPartition !== null
          ? await produceMessageToPartition(name, selectedPartition, payload)
          : await produceMessage(name, payload);
      setProduceResult(result);
      setProduceValue('');
      await loadMessages();
      await loadPage();
    } catch (err) {
      setProduceError((err as Error).message);
    } finally {
      setProduceLoading(false);
    }
  }

  if (pageLoading) return <p className="muted">Loading topic details...</p>;

  return (
    <div className="layout-grid" style={{ gap: 16 }}>
      <div className="topbar" style={{ marginBottom: 0 }}>
        <div>
          <h3 style={{ margin: '0 0 4px' }}>{prettyName}</h3>
          <p className="muted" style={{ margin: 0 }}>
            Partitions: {partitionCount}
          </p>
        </div>
        <div className="actions">
          {lastUpdated && <span className="tag">Updated {formatDate(lastUpdated)}</span>}
          <button className="button secondary" onClick={() => void loadPage()}>
            Refresh
          </button>
          <Link to="/topics" className="tag">
            back to list
          </Link>
        </div>
      </div>

      {pageError && (
        <div className="card">
          <p className="error-text" style={{ margin: 0 }}>
            Failed to load topic details: {pageError}
          </p>
        </div>
      )}

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
              const isDegraded = replicas.length > 0 && isr.length < replicas.length;
              const leaderLabel = assignment?.leader ?? p.leader;
              return (
                <tr
                  key={`${p.id}-${leaderLabel}`}
                  style={
                    isDegraded ? { backgroundColor: 'rgba(255, 196, 0, 0.08)' } : undefined
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
      </div>

      <div className="card">
        <div className="topbar" style={{ marginBottom: 10 }}>
          <div>
            <h4 style={{ margin: 0 }}>Message browser</h4>
            <p className="muted" style={{ margin: 0 }}>
              Partition-level fetch, binary-safe preview rendering, and quick offset jumps.
            </p>
          </div>
          <button className="button" onClick={() => void loadMessages()} disabled={loadingMessages}>
            {loadingMessages ? 'Loading...' : 'Load'}
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
                setOffsetInput(target ? String(target.highWatermark) : '');
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
            <label className="muted">Offset</label>
            <input
              className="input"
              type="number"
              value={offsetInput}
              onChange={(e) => setOffsetInput(e.target.value)}
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
          {selectedPartitionInfo && (
            <div className="actions">
              <button
                className="button secondary"
                onClick={() => setOffsetInput(String(selectedPartitionInfo.startOffset))}
              >
                Jump to start
              </button>
              <button
                className="button secondary"
                onClick={() => setOffsetInput(String(selectedPartitionInfo.highWatermark))}
              >
                Jump to latest
              </button>
            </div>
          )}
        </div>

        <div className="section">
          <h4 style={{ margin: '12px 0 6px' }}>Produce message</h4>
          <p className="muted" style={{ marginTop: 0 }}>
            For preview, you can publish directly into the selected partition or let broker key-hash routing choose it. Add an optional content type if you want typed rendering in the UI.
          </p>
          <div className="form-row">
            <div className="form-field">
              <label className="muted">Mode</label>
              <select
                className="select"
                value={produceMode}
                onChange={(e) => setProduceMode(e.target.value as ProduceMode)}
              >
                <option value="partition">Direct partition</option>
                <option value="hash">Hash by key</option>
              </select>
            </div>
            <div className="form-field">
              <label className="muted">
                Key {produceMode === 'hash' ? '(required)' : '(optional)'}
              </label>
              <input
                className="input"
                value={produceKey}
                onChange={(e) => setProduceKey(e.target.value)}
                placeholder="sensor-1"
              />
            </div>
            <div className="form-field" style={{ flex: 1, minWidth: 260 }}>
              <label className="muted">Value</label>
              <textarea
                className="input"
                style={{ minHeight: 96 }}
                value={produceValue}
                onChange={(e) => setProduceValue(e.target.value)}
                placeholder='{"value": 42.0}'
              />
            </div>
            <div className="form-field">
              <label className="muted">Content type</label>
              <input
                className="input"
                value={produceContentType}
                onChange={(e) => setProduceContentType(e.target.value)}
                placeholder="application/json"
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
            <p className="error-text" style={{ marginBottom: 0 }}>
              {produceError}
            </p>
          )}
          {produceResult && (
            <p className="success-text" style={{ marginBottom: 0 }}>
              Sent to partition {produceResult.partition}, base offset {produceResult.baseOffset}.
            </p>
          )}
        </div>

        <div className="section">
          <h4 style={{ margin: '12px 0 6px' }}>Messages ({messages.length})</h4>
          {selectedPartitionInfo && (
            <p className="muted" style={{ marginTop: 0 }}>
              HWM: {selectedPartitionInfo.highWatermark}, Start: {selectedPartitionInfo.startOffset}
            </p>
          )}
          {messages.length ? (
            messages.map((msg) => {
              const payload = inspectPayload(msg.value, msg.contentType);
              return (
                <div key={`${msg.partition}-${msg.offset}`} className="message">
                  <div className="meta">
                    Partition {msg.partition} - Offset {msg.offset} - {formatDate(msg.timestamp)}
                  </div>
                  <div className="message-badges">
                    {payload.badges.map((badge) => (
                      <span key={`${msg.offset}-${badge}`} className="tag">
                        {badge}
                      </span>
                    ))}
                  </div>
                  <pre>{payload.display}</pre>
                </div>
              );
            })
          ) : (
            <p className="muted">No data yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

type TopicDetailsMessage = {
  partition: number;
  offset: number;
  key?: string;
  value: string;
  timestamp: string;
  contentType?: string;
};

function formatList(values: number[] | null | undefined) {
  if (!values || !values.length) return '-';
  return values.join(', ');
}
