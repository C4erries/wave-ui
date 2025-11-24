export interface StatsResult {
  min: number;
  max: number;
  mean: number;
  median: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  std: number;
  rms: number;
}

export function calculateStats(values: number[]): StatsResult | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mean = sorted.reduce((acc, v) => acc + v, 0) / sorted.length;
  const variance =
    sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) /
    sorted.length;
  const std = Math.sqrt(variance);
  const rms = Math.sqrt(
    sorted.reduce((acc, v) => acc + v * v, 0) / sorted.length,
  );

  const percentile = (p: number) => getPercentile(sorted, p);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean,
    median: percentile(50),
    p50: percentile(50),
    p90: percentile(90),
    p95: percentile(95),
    p99: percentile(99),
    std,
    rms,
  };
}

export function getPercentile(values: number[], percentile: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  if (lower === upper) return sorted[lower];
  const weight = rank - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function buildHistogram(values: number[], buckets = 10) {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = (max - min || 1) / buckets;

  const counts = Array.from({ length: buckets }, () => 0);
  values.forEach((v) => {
    const index = Math.min(
      buckets - 1,
      Math.floor((v - min) / step),
    );
    counts[index] += 1;
  });

  return counts.map((count, idx) => ({
    bucket: `${(min + idx * step).toFixed(2)} - ${(min + (idx + 1) * step).toFixed(2)}`,
    count,
  }));
}
