import type {
  BrokerInfo,
  ProduceResult,
  BrokerSummary,
  ClusterMetadata,
  ConsumerGroup,
  ControllerStatus,
  Message,
  MessageQuery,
  Topic,
  TopicDetails,
} from '@/types';

const envApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const baseURL = envApiBase ? envApiBase.replace(/\/$/, '') : '';

async function requestJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseURL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  const text = await res.text();
  if (!res.ok) {
    const detail = extractErrorDetail(text);
    throw new Error(
      detail
        ? `${res.status} ${res.statusText}: ${detail}`
        : `${res.status} ${res.statusText}`,
    );
  }
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

function extractErrorDetail(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return '';

  try {
    const parsed = JSON.parse(trimmed) as { error?: string; message?: string };
    return parsed.error ?? parsed.message ?? trimmed;
  } catch {
    return trimmed;
  }
}

export async function fetchBrokerInfo(): Promise<BrokerInfo> {
  return requestJSON('/api/broker');
}

export async function fetchBrokerSummary(): Promise<BrokerSummary> {
  return requestJSON('/api/summary');
}

export async function fetchControllerStatus(): Promise<ControllerStatus> {
  return requestJSON('/api/controller');
}

export async function fetchClusterMetadata(): Promise<ClusterMetadata> {
  return requestJSON('/api/cluster');
}

export async function fetchTopics(): Promise<Topic[]> {
  const data = await requestJSON<Topic[] | undefined>('/api/topics');
  return data ?? [];
}

export async function fetchTopicDetails(name: string): Promise<TopicDetails> {
  const data = await requestJSON<TopicDetails>(
    `/api/topics/${encodeURIComponent(name)}`,
  );
  return {
    ...data,
    partitionCount: data.partitionCount ?? data.partitions.length,
  };
}

export async function fetchMessages(
  topic: string,
  query: MessageQuery = {},
): Promise<Message[]> {
  const params = new URLSearchParams();
  if (query.offset !== undefined) params.set('offset', String(query.offset));
  if (query.limit !== undefined) params.set('limit', String(query.limit));

  const suffix =
    query.partition === undefined
      ? `/messages`
      : `/partitions/${query.partition}/messages`;
  const data = await requestJSON<Message[] | undefined>(
    `/api/topics/${encodeURIComponent(topic)}${suffix}?${params.toString()}`,
  );
  return data ?? [];
}

export async function fetchConsumerGroups(): Promise<ConsumerGroup[]> {
  const data = await requestJSON<ConsumerGroup[] | undefined>('/api/consumers');
  return data ?? [];
}

export async function createTopic(payload: {
  name: string;
  partitions: number;
  replicationFactor: number;
}): Promise<TopicDetails | void> {
  return requestJSON<TopicDetails | void>('/api/topics', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function produceMessage(
  topic: string,
  data: { key?: string; value: string },
): Promise<ProduceResult> {
  return requestJSON<ProduceResult>(
    `/api/topics/${encodeURIComponent(topic)}/messages`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
}

export async function produceMessageToPartition(
  topic: string,
  partition: number,
  data: { key?: string; value: string },
): Promise<ProduceResult> {
  return requestJSON<ProduceResult>(
    `/api/topics/${encodeURIComponent(topic)}/partitions/${partition}/messages`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
}
