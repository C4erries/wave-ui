export interface BrokerInfo {
  id: number;
  binaryEndpoint: string;
  mqttEndpoint: string;
  httpEndpoint: string;
  clusterID?: string;
  replicationFactor?: number;
  controllerMode?: 'single' | 'raft' | string;
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
  leader: number;
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
  contentType?: string;
}

export interface ProduceResult {
  partition: number;
  baseOffset: number;
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

export interface ControllerPeer {
  id: string;
  address: string;
}

export interface ControllerStatus {
  mode: 'single' | 'raft' | string;
  raftState: 'leader' | 'follower' | 'candidate' | 'none' | string;
  term: number;
  peers?: ControllerPeer[] | null;
  clusterID?: string;
  version?: number;
}

export interface ClusterBrokerInfo {
  brokerID: number;
  host: string;
  port: number;
  rack: string;
}

export interface PartitionAssignment {
  topic: string;
  partition: number;
  replicas?: number[] | null;
  isr?: number[] | null;
  leader: number;
  leaderEpoch: number;
}

export interface ClusterMetadata {
  clusterID: string;
  version: number;
  brokers: ClusterBrokerInfo[];
  partitions: PartitionAssignment[];
}
