import { useEffect, useMemo, useState } from 'react';
import { fetchMessages, fetchTopicDetails, fetchTopics } from '@/api/brokerApi';
import HistogramChart from '@/components/charts/HistogramChart';
import WaveformChart from '@/components/charts/WaveformChart';
import type { Message, Topic } from '@/types';
import { formatDate } from '@/utils/format';
import { inspectPayload, parseNumericPayload } from '@/utils/payload';
import { buildHistogram, calculateStats } from '@/utils/stats';
import type { StatsResult } from '@/utils/stats';

type NumericMessage = { message: Message; value: number; kind: string };

export default function DataAnalysis() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [partitions, setPartitions] = useState<number[]>([]);
  const [selectedPartition, setSelectedPartition] = useState<string>('all');
  const [limit, setLimit] = useState(50);
  const [messages, setMessages] = useState<Message[]>([]);
  const [numericMessages, setNumericMessages] = useState<NumericMessage[]>([]);
  const [stats, setStats] = useState<StatsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTopics()
      .then((list) => {
        setTopics(list);
        if (list[0]) setSelectedTopic(list[0].name);
      })
      .catch((err) => setError((err as Error).message));
  }, []);

  useEffect(() => {
    if (!selectedTopic) return;
    fetchTopicDetails(selectedTopic)
      .then((detail) => {
        setPartitions(detail.partitions.map((p) => p.id));
        setSelectedPartition('all');
      })
      .catch((err) => setError((err as Error).message));
  }, [selectedTopic]);

  const waveformData = useMemo(
    () =>
      numericMessages
        .map((item) => ({
          x: item.message.offset,
          value: item.value,
        }))
        .sort((a, b) => Number(a.x) - Number(b.x)),
    [numericMessages],
  );

  const histogramData = useMemo(() => {
    const values = numericMessages.map((m) => m.value);
    return buildHistogram(values, 12).map((h) => ({
      bucket: h.bucket,
      count: h.count,
    }));
  }, [numericMessages]);

  async function loadData() {
    if (!selectedTopic) return;
    setLoading(true);
    setError(null);
    try {
      const partition = selectedPartition === 'all' ? undefined : Number(selectedPartition);
      const msgs = await fetchMessages(selectedTopic, { partition, limit });
      setMessages(msgs);
      const numeric = extractNumeric(msgs);
      setNumericMessages(numeric);
      setStats(numeric.length ? calculateStats(numeric.map((n) => n.value)) : null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const numericKinds = Array.from(new Set(numericMessages.map((item) => item.kind)));

  return (
    <div className="layout-grid" style={{ gap: 16 }}>
      <div className="card">
        <div className="topbar" style={{ marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>Data analysis</h3>
            <p className="muted" style={{ margin: 0 }}>
              Typed payloads are rendered from <code>contentType</code> when available. JSON and text types are shown directly, and binary types such as float64 are decoded when the broker labels them or falls back to <code>base64:</code>.
            </p>
          </div>
          <button className="button" onClick={() => void loadData()} disabled={loading}>
            {loading ? 'Loading...' : 'Load data'}
          </button>
        </div>
        <div className="form-row">
          <div className="form-field">
            <label className="muted">Topic</label>
            <select
              className="select"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
            >
              {topics.map((topic) => (
                <option key={topic.name} value={topic.name}>
                  {topic.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="muted">Partition</label>
            <select
              className="select"
              value={selectedPartition}
              onChange={(e) => setSelectedPartition(e.target.value)}
            >
              <option value="all">All</option>
              {partitions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label className="muted">Last N messages</label>
            <input
              className="input"
              type="number"
              min={5}
              max={200}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            />
          </div>
        </div>
        {error && (
          <p className="error-text" style={{ marginBottom: 0 }}>
            {error}
          </p>
        )}
      </div>

      <div className="layout-grid two">
        <div className="card">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="label">Loaded messages</div>
              <div className="value">{messages.length}</div>
            </div>
            <div className="stat-item">
              <div className="label">Numeric messages</div>
              <div className="value">{numericMessages.length}</div>
            </div>
            <div className="stat-item">
              <div className="label">Numeric encodings</div>
              <div className="value">{numericKinds.join(', ') || '-'}</div>
            </div>
          </div>
        </div>
        <div className="card">
          <p className="muted" style={{ margin: '0 0 8px' }}>
            Supported numeric paths
          </p>
          <div className="message-badges">
            <span className="tag">plain number</span>
            <span className="tag">JSON number</span>
            <span className="tag">{'{ "value": n }'}</span>
            <span className="tag">content-type aware</span>
            <span className="tag">base64 float64</span>
          </div>
        </div>
      </div>

      <div className="layout-grid two">
        <WaveformChart data={waveformData} title="Waveform (value vs offset)" />
        <HistogramChart data={histogramData} title="Histogram" />
      </div>

      {stats ? (
        <div className="card">
          <h4 style={{ margin: '0 0 10px' }}>Statistics</h4>
          <div className="stats-grid">
            <Stat label="Min" value={stats.min} />
            <Stat label="Max" value={stats.max} />
            <Stat label="Mean" value={stats.mean} />
            <Stat label="Median" value={stats.median} />
            <Stat label="p50" value={stats.p50} />
            <Stat label="p90" value={stats.p90} />
            <Stat label="p95" value={stats.p95} />
            <Stat label="p99" value={stats.p99} />
            <Stat label="STD" value={stats.std} />
            <Stat label="RMS" value={stats.rms} />
          </div>
        </div>
      ) : (
        <div className="card">
          <p className="muted">
            No numeric payloads detected yet. Load topic data and use plain numbers, JSON numeric fields, base64 float64 payloads, or typed messages with <code>contentType</code>.
          </p>
        </div>
      )}

      <div className="card">
        <h4 style={{ margin: '0 0 8px' }}>Messages</h4>
        {messages.map((msg) => {
          const payload = inspectPayload(msg.value, msg.contentType);
          return (
            <div key={`${msg.partition}-${msg.offset}`} className="message">
              <div className="meta">
                p{msg.partition} - offset {msg.offset} - {formatDate(msg.timestamp)}
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
        })}
        {!messages.length && <p className="muted">No messages loaded yet.</p>}
      </div>
    </div>
  );
}

function extractNumeric(messages: Message[]): NumericMessage[] {
  const numeric: NumericMessage[] = [];
  messages.forEach((msg) => {
    const value = parseNumericPayload(msg.value, msg.contentType);
    if (value === null) return;
    const info = inspectPayload(msg.value, msg.contentType);
    numeric.push({ message: msg, value, kind: info.kind });
  });
  return numeric;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-item">
      <div className="label">{label}</div>
      <div className="value">{value.toFixed(3)}</div>
    </div>
  );
}
