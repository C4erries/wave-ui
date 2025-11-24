export function formatNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

export function formatDate(value: string | number): string {
  const date = new Date(value);
  return date.toLocaleString();
}

export function formatLatency(seconds: number): string {
  if (!Number.isFinite(seconds)) return 'Infinity';
  if (seconds < 1) return `${(seconds * 1000).toFixed(1)} ms`;
  return `${seconds.toFixed(2)} s`;
}
