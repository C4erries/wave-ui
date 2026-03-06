import type {
  BrokerInfo,
  BrokerSummary,
  ClusterMetadata,
  ConsumerGroup,
  ConsumerGroupPartition,
  ControllerStatus,
  Message,
  MessageQuery,
  Partition,
  ProduceResult,
  Topic,
  TopicDetails,
} from '@/types';

const topics: Topic[] = [
  { name: 'telemetry', partitions: 3, replicationFactor: 1 },
  { name: 'signals', partitions: 2, replicationFactor: 1 },
  { name: 'orders', partitions: 4, replicationFactor: 1 },
  { name: 'metrics', partitions: 1, replicationFactor: 1 },
];

const partitionsByTopic: Record<string, Partition[]> = {
  telemetry: [
    { id: 0, leader: 1, highWatermark: 4200, startOffset: 0 },
    { id: 1, leader: 1, highWatermark: 4150, startOffset: 0 },
    { id: 2, leader: 1, highWatermark: 4100, startOffset: 0 },
  ],
  signals: [
    { id: 0, leader: 1, highWatermark: 980, startOffset: 0 },
    { id: 1, leader: 1, highWatermark: 965, startOffset: 0 },
  ],
  orders: [
    { id: 0, leader: 1, highWatermark: 2100, startOffset: 0 },
    { id: 1, leader: 1, highWatermark: 2080, startOffset: 0 },
    { id: 2, leader: 1, highWatermark: 2050, startOffset: 0 },
    { id: 3, leader: 1, highWatermark: 2040, startOffset: 0 },
  ],
  metrics: [{ id: 0, leader: 1, highWatermark: 320, startOffset: 0 }],
};

const messagesByTopic: Record<string, Message[]> = buildMessageStore();

const consumerGroups: ConsumerGroup[] = [
  {
    name: 'analytics-service',
    members: 3,
    assignments: buildAssignments('telemetry', partitionsByTopic.telemetry, 10),
  },
  {
    name: 'signal-monitor',
    members: 2,
    assignments: buildAssignments('signals', partitionsByTopic.signals, 5),
  },
  {
    name: 'orders-api',
    members: 1,
    assignments: buildAssignments('orders', partitionsByTopic.orders, 3),
  },
];

const brokerInfo: BrokerInfo = {
  id: 1,
  binaryEndpoint: 'tcp://localhost:7030',
  mqttEndpoint: 'mqtt://localhost:1883',
  httpEndpoint: 'http://localhost:8090',
  clusterID: 'local-mock',
  replicationFactor: 1,
  controllerMode: 'single',
};

const brokerSummary: BrokerSummary = {
  topics: topics.length,
  partitions: Object.values(partitionsByTopic).reduce(
    (acc, arr) => acc + arr.length,
    0,
  ),
  produced: 125_430,
  consumed: 118_910,
  errors: 6,
};

const controllerStatus: ControllerStatus = {
  mode: 'single',
  raftState: 'none',
  term: 0,
  peers: [],
  clusterID: 'local-mock',
  version: 1,
};

const clusterMetadata: ClusterMetadata = {
  clusterID: 'local-mock',
  version: 1,
  brokers: [{ brokerID: 1, host: 'localhost', port: 7030, rack: '' }],
  partitions: [
    { topic: 'telemetry', partition: 0, replicas: [1], isr: [1], leader: 1, leaderEpoch: 1 },
    { topic: 'signals', partition: 0, replicas: [1], isr: [1], leader: 1, leaderEpoch: 1 },
    { topic: 'orders', partition: 0, replicas: [1], isr: [1], leader: 1, leaderEpoch: 1 },
  ],
};

function buildAssignments(
  topic: string,
  partitions: Partition[],
  lagSeed: number,
): ConsumerGroupPartition[] {
  return partitions.map((p, idx) => ({
    topic,
    partition: p.id,
    highWatermark: p.highWatermark,
    committedOffset: p.highWatermark - (lagSeed - idx) * 2,
    lag: (lagSeed - idx) * 2,
  }));
}

function buildMessageStore(): Record<string, Message[]> {
  const now = Date.now();
  const store: Record<string, Message[]> = {};

  topics.forEach((topic) => {
    const messages: Message[] = [];
    const partitions = partitionsByTopic[topic.name] ?? [];
    partitions.forEach((partition) => {
      for (let i = 0; i < 40; i += 1) {
        const offset = partition.highWatermark - i;
        const timestamp = new Date(now - i * 750 - partition.id * 100).toISOString();
        const numericValue =
          topic.name === 'signals'
            ? Math.sin(offset / 6) * 20 + 50 + Math.random() * 5
            : topic.name === 'telemetry'
              ? Math.cos(offset / 10) * 5 + 30 + Math.random() * 2
              : topic.name === 'orders'
                ? 100 + (offset % 10) * 3 + Math.random()
                : 5 + (offset % 5) * 0.5 + Math.random() * 0.2;

        const payload =
          topic.name === 'orders'
            ? { orderId: `ord-${offset}`, total: Number(numericValue.toFixed(2)) }
            : { value: Number(numericValue.toFixed(3)) };

        messages.push({
          partition: partition.id,
          offset,
          key: `${topic.name}-${partition.id}-${offset % 7}`,
          value: JSON.stringify(payload),
          timestamp,
        });
      }
    });
    store[topic.name] = messages;
  });

  return store;
}

export async function getBrokerInfo(): Promise<BrokerInfo> {
  return brokerInfo;
}

export async function getBrokerSummary(): Promise<BrokerSummary> {
  return brokerSummary;
}

export async function getControllerStatus(): Promise<ControllerStatus> {
  return controllerStatus;
}

export async function getClusterMetadata(): Promise<ClusterMetadata> {
  return clusterMetadata;
}

export async function getTopics(): Promise<Topic[]> {
  return topics;
}

export async function getTopicDetails(name: string): Promise<TopicDetails> {
  const topic = topics.find((t) => t.name === name);
  if (!topic) throw new Error('Topic not found');
  return {
    name: topic.name,
    partitionCount: topic.partitions,
    replicationFactor: topic.replicationFactor,
    partitions: partitionsByTopic[name] ?? [],
  };
}

export async function getMessages(
  topic: string,
  query: MessageQuery = {},
): Promise<Message[]> {
  const store = messagesByTopic[topic] ?? [];
  const filtered = store
    .filter((m) => (query.partition === undefined ? true : m.partition === query.partition))
    .filter((m) => (query.offset === undefined ? true : m.offset <= query.offset))
    .sort((a, b) => b.offset - a.offset);

  const limit = query.limit ?? 20;
  return filtered.slice(0, limit);
}

export async function getConsumerGroups(): Promise<ConsumerGroup[]> {
  return consumerGroups;
}

export async function createTopic(payload: {
  name: string;
  partitions: number;
  replicationFactor: number;
}): Promise<TopicDetails> {
  const exists = topics.find((t) => t.name === payload.name);
  if (exists) throw new Error('Topic already exists');

  const newTopic: Topic = {
    name: payload.name,
    partitions: payload.partitions,
    replicationFactor: payload.replicationFactor,
  };
  topics.push(newTopic);
  partitionsByTopic[payload.name] = Array.from(
    { length: payload.partitions },
    (_, idx) => ({
      id: idx,
      leader: 1,
      highWatermark: 0,
      startOffset: 0,
    }),
  );
  messagesByTopic[payload.name] = [];
  brokerSummary.topics = topics.length;
  brokerSummary.partitions += payload.partitions;

  return {
    name: newTopic.name,
    partitionCount: newTopic.partitions,
    replicationFactor: newTopic.replicationFactor,
    partitions: partitionsByTopic[payload.name],
  };
}

export async function produceMessage(
  topic: string,
  data: { key?: string; value: string },
): Promise<ProduceResult> {
  const parts = partitionsByTopic[topic];
  if (!parts) throw new Error('Topic not found');

  const key = (data.key ?? '').trim();
  if (!key) throw new Error('Key is required for hash routing');

  const idx = hashKeyToIndex(key, parts.length);
  const targetPartition = parts[idx]?.id;

  const partitionInfo = parts.find((p) => p.id === targetPartition);
  if (!partitionInfo) throw new Error('Partition not found');

  const baseOffset = partitionInfo.highWatermark + 1;
  partitionInfo.highWatermark = baseOffset;
  const message: Message = {
    partition: targetPartition,
    offset: baseOffset,
    key,
    value: data.value,
    timestamp: new Date().toISOString(),
  };
  messagesByTopic[topic] = [message, ...(messagesByTopic[topic] ?? [])];
  brokerSummary.produced += 1;

  return {
    partition: targetPartition,
    baseOffset,
  };
}

function hashKeyToIndex(key: string, modulo: number): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0) % modulo;
}
