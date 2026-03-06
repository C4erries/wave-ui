import { useEffect, useMemo, useState } from 'react';
import { fetchMessages, fetchTopicDetails, fetchTopics } from '@/api/brokerApi';
import HistogramChart from '@/components/charts/HistogramChart';
import WaveformChart from '@/components/charts/WaveformChart';
import type { Message, Topic } from '@/types';
import { formatDate } from '@/utils/format';
import { buildHistogram, calculateStats } from '@/utils/stats';
import type { StatsResult } from '@/utils/stats';

type NumericMessage = { message: Message; value: number };

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

  useEffect(() => {
    fetchTopics()
      .then((list) => {
        setTopics(list);
        if (list[0]) setSelectedTopic(list[0].name);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedTopic) return;
    fetchTopicDetails(selectedTopic)
      .then((detail) => {
        setPartitions(detail.partitions.map((p) => p.id));
        setSelectedPartition('all');
      })
      .catch(console.error);
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
    try {
      const partition =
        selectedPartition === 'all' ? undefined : Number(selectedPartition);
      const msgs = await fetchMessages(selectedTopic, { partition, limit });
      setMessages(msgs);
      const numeric = extractNumeric(msgs);
      setNumericMessages(numeric);
      setStats(calculateStats(numeric.map((n) => n.value)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="layout-grid" style={{ gap: 16 }}>
      <div className="card">
        <div className="topbar" style={{ marginBottom: 12 }}>
          <div>
            <h3 style={{ margin: 0 }}>Data analysis</h3>
            <p className="muted" style={{ margin: 0 }}>
              Select topic/partition and load recent messages to compute stats and
              render the waveform.
            </p>
          </div>
          <button className="button" onClick={loadData} disabled={loading}>
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
            No numeric payloads yet - load data to see statistics.
          </p>
        </div>
      )}

      <div className="card">
        <h4 style={{ margin: '0 0 8px' }}>Messages</h4>
        {messages.map((msg) => (
          <div key={`${msg.partition}-${msg.offset}`} className="message">
            <div className="meta">
              p{msg.partition} - offset {msg.offset} - {formatDate(msg.timestamp)}
            </div>
            <pre>{prettyPrint(msg.value)}</pre>
          </div>
        ))}
        {!messages.length && (
          <p className="muted">No messages loaded yet.</p>
        )}
      </div>
    </div>
  );
}

function extractNumeric(messages: Message[]): NumericMessage[] {
  const numeric: NumericMessage[] = [];
  messages.forEach((msg) => {
    const value = parseNumeric(msg.value);
    if (value === null) return;
    numeric.push({ message: msg, value });
  });
  return numeric;
}

function parseNumeric(raw: string): number | null {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'number') return parsed;
    if (parsed && typeof parsed === 'object') {
      const candidate =
        (parsed as Record<string, unknown>).value ??
        (parsed as Record<string, unknown>).total;
      const num = Number(candidate);
      if (!Number.isNaN(num)) return num;
    }
  } catch {
    // ignore
  }
  const direct = Number(raw);
  return Number.isFinite(direct) ? direct : null;
}

function prettyPrint(value: string) {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-item">
      <div className="label">{label}</div>
      <div className="value">{value.toFixed(3)}</div>
    </div>
  );
}
