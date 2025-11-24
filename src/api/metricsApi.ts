import type { Histogram, HistogramBucket, LatencyPercentiles, MetricsSnapshot } from '@/types';

const baseURL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
  'http://localhost:8090';
const metricsURL =
  (import.meta.env.VITE_METRICS_URL as string | undefined) ??
  `${baseURL}/metrics`;

const METRIC_REGEX =
  /^(?<name>[a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{(?<labels>[^}]*)\})?\s+(?<value>[-+]?[0-9]*\\.?[0-9]+(?:[eE][-+]?\\d+)?)/;

export async function fetchMetrics(): Promise<MetricsSnapshot> {
  const res = await fetch(metricsURL);
  if (!res.ok) {
    throw new Error(`Metrics request failed: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  return parseMetrics(text);
}

export function parseMetrics(text: string): MetricsSnapshot {
  const producedTotal: Record<string, number> = {};
  const consumedTotal: Record<string, number> = {};
  const produceBuckets: HistogramBucket[] = [];
  const fetchBuckets: HistogramBucket[] = [];
  let requestErrorsTotal = 0;
  let produceCount: number | undefined;
  let produceSum: number | undefined;
  let fetchCount: number | undefined;
  let fetchSum: number | undefined;

  const lines = text.split('\\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(METRIC_REGEX);
    if (!match || !match.groups) continue;
    const { name, labels: labelsStr, value: rawValue } = match.groups;
    const value = Number(rawValue);
    const labels = parseLabels(labelsStr);

    switch (name) {
      case 'messages_produced_total': {
        producedTotal[labels.topic ?? 'total'] = value;
        break;
      }
      case 'messages_consumed_total': {
        consumedTotal[labels.topic ?? 'total'] = value;
        break;
      }
      case 'request_errors_total': {
        requestErrorsTotal = value;
        break;
      }
      case 'produce_latency_seconds_bucket': {
        produceBuckets.push({
          le: bucketBound(labels.le),
          count: value,
        });
        break;
      }
      case 'produce_latency_seconds_count': {
        produceCount = value;
        break;
      }
      case 'produce_latency_seconds_sum': {
        produceSum = value;
        break;
      }
      case 'fetch_latency_seconds_bucket': {
        fetchBuckets.push({
          le: bucketBound(labels.le),
          count: value,
        });
        break;
      }
      case 'fetch_latency_seconds_count': {
        fetchCount = value;
        break;
      }
      case 'fetch_latency_seconds_sum': {
        fetchSum = value;
        break;
      }
      default:
        break;
    }
  }

  return {
    producedTotal,
    consumedTotal,
    requestErrorsTotal,
    produceLatency: {
      buckets: produceBuckets.sort((a, b) => a.le - b.le),
      count: produceCount,
      sum: produceSum,
    },
    fetchLatency: {
      buckets: fetchBuckets.sort((a, b) => a.le - b.le),
      count: fetchCount,
      sum: fetchSum,
    },
    timestamp: Date.now(),
  };
}

export function percentileFromHistogram(
  histogram: Histogram,
  percentile: number,
): number {
  if (!histogram.buckets.length) return 0;
  const total =
    histogram.count ?? histogram.buckets[histogram.buckets.length - 1].count;
  if (!total) return 0;
  const target = (percentile / 100) * total;
  for (const bucket of histogram.buckets) {
    if (bucket.count >= target) return bucket.le;
  }
  return histogram.buckets[histogram.buckets.length - 1].le;
}

export function latencyPercentiles(histogram: Histogram): LatencyPercentiles {
  return {
    p50: percentileFromHistogram(histogram, 50),
    p90: percentileFromHistogram(histogram, 90),
    p95: percentileFromHistogram(histogram, 95),
    p99: percentileFromHistogram(histogram, 99),
  };
}

export function toDensityBuckets(buckets: HistogramBucket[]) {
  if (!buckets.length) return [];
  const ordered = [...buckets].sort((a, b) => a.le - b.le);
  return ordered.map((bucket, idx) => {
    const prev = idx === 0 ? 0 : ordered[idx - 1].count;
    return {
      le: bucket.le,
      count: Math.max(0, bucket.count - prev),
    };
  });
}

function parseLabels(raw?: string) {
  if (!raw) return {} as Record<string, string>;
  return raw.split(',').reduce<Record<string, string>>((acc, pair) => {
    const [key, quotedValue] = pair.split('=');
    if (!key || quotedValue === undefined) return acc;
    acc[key.trim()] = quotedValue.replace(/^\"|\"$/g, '');
    return acc;
  }, {});
}

function bucketBound(value?: string) {
  if (!value || value === '+Inf') return Number.POSITIVE_INFINITY;
  return Number(value);
}
