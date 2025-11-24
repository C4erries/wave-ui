import { useEffect, useRef, useState } from 'react';
import ThroughputChart from '@/components/charts/ThroughputChart';
import HistogramChart from '@/components/charts/HistogramChart';
import Card from '@/components/Card';
import {
  fetchMetrics,
  latencyPercentiles,
  toDensityBuckets,
} from '@/api/metricsApi';
import type { LatencyPercentiles, MetricsSnapshot } from '@/types';
import { formatLatency, formatNumber } from '@/utils/format';

type History = Record<string, Array<{ time: string; produced: number; consumed: number }>>;

export default function Metrics() {
  const [snapshot, setSnapshot] = useState<MetricsSnapshot | null>(null);
  const [history, setHistory] = useState<History>({});
  const prevRef = useRef<MetricsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await fetchMetrics();
        if (!active) return;
        setSnapshot(data);
        updateHistory(data);
        prevRef.current = data;
      } catch (err) {
        setError((err as Error).message);
      }
    };

    load();
    const id = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  function updateHistory(current: MetricsSnapshot) {
    const prev = prevRef.current;
    if (!prev) return;
    const deltaSec = Math.max(1, (current.timestamp - prev.timestamp) / 1000);
    const topics = new Set([
      ...Object.keys(current.producedTotal),
      ...Object.keys(current.consumedTotal),
    ]);

    setHistory((old) => {
      const next: History = { ...old };
      topics.forEach((topic) => {
        const producedRate = rate(
          prev.producedTotal[topic] ?? 0,
          current.producedTotal[topic] ?? 0,
          deltaSec,
        );
        const consumedRate = rate(
          prev.consumedTotal[topic] ?? 0,
          current.consumedTotal[topic] ?? 0,
          deltaSec,
        );
        const point = {
          time: new Date(current.timestamp).toLocaleTimeString(),
          produced: producedRate,
          consumed: consumedRate,
        };
        const prevSeries = old[topic] ?? [];
        next[topic] = [...prevSeries, point].slice(-24);
      });
      return next;
    });
  }

  if (error) return <p className="muted">Failed to load metrics: {error}</p>;
  if (!snapshot) return <p className="muted">Loading metrics...</p>;

  const producePercentiles = latencyPercentiles(snapshot.produceLatency);
  const fetchPercentiles = latencyPercentiles(snapshot.fetchLatency);

  const produceBuckets = toDensityBuckets(snapshot.produceLatency.buckets).map(
    (b) => ({
      bucket: bucketLabel(b.le),
      count: b.count,
    }),
  );
  const fetchBuckets = toDensityBuckets(snapshot.fetchLatency.buckets).map(
    (b) => ({
      bucket: bucketLabel(b.le),
      count: b.count,
    }),
  );

  return (
    <div className="layout-grid" style={{ gap: 16 }}>
      <div className="layout-grid three">
        <Card
          title="messages_produced_total"
          value={formatNumber(total(snapshot.producedTotal))}
          subtitle="Cumulative per topic"
        />
        <Card
          title="messages_consumed_total"
          value={formatNumber(total(snapshot.consumedTotal))}
          subtitle="Cumulative per topic"
        />
        <Card
          title="request_errors_total"
          value={snapshot.requestErrorsTotal}
          subtitle="Errors since start"
        />
      </div>

      <div className="card">
        <h4 style={{ margin: '0 0 10px' }}>Latency percentiles</h4>
        <div className="layout-grid two">
          <LatencyPanel label="Produce latency" data={producePercentiles} />
          <LatencyPanel label="Fetch latency" data={fetchPercentiles} />
        </div>
      </div>

      <div className="layout-grid two">
        <HistogramChart data={produceBuckets} title="Produce latency histogram" />
        <HistogramChart data={fetchBuckets} title="Fetch latency histogram" />
      </div>

      <div className="layout-grid">
        {Object.entries(history).map(([topic, series]) => (
          <ThroughputChart
            key={topic}
            data={series}
            title={`Throughput - ${topic}`}
          />
        ))}
        {!Object.keys(history).length && (
          <p className="muted">Not enough samples yet to plot throughput.</p>
        )}
      </div>
    </div>
  );
}

function LatencyPanel({
  label,
  data,
}: {
  label: string;
  data: LatencyPercentiles;
}) {
  return (
    <div>
      <p className="muted" style={{ margin: '0 0 8px' }}>
        {label}
      </p>
      <div className="stats-grid">
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

function rate(prev: number, current: number, deltaSec: number) {
  return Math.max(0, (current - prev) / deltaSec);
}

function total(map: Record<string, number>) {
  return Object.values(map).reduce((acc, val) => acc + val, 0);
}

function bucketLabel(le: number) {
  if (!Number.isFinite(le)) return '+Inf';
  if (le < 1) return `${(le * 1000).toFixed(0)} ms`;
  return `${le.toFixed(2)} s`;
}
