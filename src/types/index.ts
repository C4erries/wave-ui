export interface BrokerInfo {
  id: string;
  binaryEndpoint: string;
  mqttEndpoint: string;
  httpEndpoint: string;
}

export interface BrokerSummary {
  topics: number;
  partitions: number;
  produced: number;
  consumed: number;
  errors: number;
}

export interface Topic {
  name: string;
  partitions: number;
  replicationFactor: number;
}

export interface Partition {
  id: number;
  leader: string;
  highWatermark: number;
  startOffset: number;
}

export interface TopicDetails {
  name: string;
  partitionCount: number;
  replicationFactor: number;
  partitions: Partition[];
}

export interface Message {
  partition: number;
  offset: number;
  key?: string;
  value: string;
  timestamp: string;
}

export interface MessageQuery {
  partition?: number;
  offset?: number;
  limit?: number;
}

export interface ConsumerGroupPartition {
  topic: string;
  partition: number;
  committedOffset: number;
  highWatermark: number;
  lag: number;
}

export interface ConsumerGroup {
  name: string;
  members: number;
  assignments: ConsumerGroupPartition[];
}

export interface ThroughputSample {
  timestamp: number;
  produced: number;
  consumed: number;
  topic: string;
}

export interface HistogramBucket {
  le: number;
  count: number;
}

export interface Histogram {
  buckets: HistogramBucket[];
  sum?: number;
  count?: number;
}

export interface LatencyPercentiles {
  p50: number;
  p90: number;
  p95: number;
  p99: number;
}

export interface MetricsSnapshot {
  producedTotal: Record<string, number>;
  consumedTotal: Record<string, number>;
  requestErrorsTotal: number;
  produceLatency: Histogram;
  fetchLatency: Histogram;
  timestamp: number;
}

export interface BrokerHealth {
  status: 'up' | 'down' | 'degraded';
  message?: string;
}
