import type {
  BrokerInfo,
  BrokerSummary,
  ClusterMetadata,
  ConsumerGroup,
  ControllerStatus,
  Message,
  MessageQuery,
  Topic,
  TopicDetails,
} from '@/types';
import * as mock from './mockBrokerApi';

const envApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
const baseURL = envApiBase ? envApiBase.replace(/\/$/, '') : '';
const useMocks =
  (import.meta.env.VITE_USE_MOCKS as string | undefined)?.toLowerCase() !== 'false';

async function requestJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseURL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function fetchBrokerInfo(): Promise<BrokerInfo> {
  if (useMocks) return mock.getBrokerInfo();
  return requestJSON('/api/broker');
}

export async function fetchBrokerSummary(): Promise<BrokerSummary> {
  if (useMocks) return mock.getBrokerSummary();
  return requestJSON('/api/summary');
}

export async function fetchControllerStatus(): Promise<ControllerStatus> {
  if (useMocks) return mock.getControllerStatus();
  return requestJSON('/api/controller');
}

export async function fetchClusterMetadata(): Promise<ClusterMetadata> {
  if (useMocks) return mock.getClusterMetadata();
  return requestJSON('/api/cluster');
}

export async function fetchTopics(): Promise<Topic[]> {
  if (useMocks) return mock.getTopics();
  const data = await requestJSON<Topic[] | undefined>('/api/topics');
  return data ?? [];
}

export async function fetchTopicDetails(name: string): Promise<TopicDetails> {
  if (useMocks) return mock.getTopicDetails(name);
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
  if (useMocks) return mock.getMessages(topic, query);

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
  if (useMocks) return mock.getConsumerGroups();
  const data = await requestJSON<ConsumerGroup[] | undefined>('/api/consumers');
  return data ?? [];
}

export async function createTopic(payload: {
  name: string;
  partitions: number;
  replicationFactor: number;
}): Promise<TopicDetails | void> {
  if (useMocks) return mock.createTopic(payload);
  return requestJSON<TopicDetails | void>('/api/topics', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function produceMessage(
  topic: string,
  data: { key?: string; value: string },
  partition?: number,
): Promise<void> {
  if (useMocks) return mock.produceMessage(topic, data, partition);
  const suffix =
    partition === undefined
      ? `/messages`
      : `/partitions/${partition}/messages`;
  await requestJSON<void>(
    `/api/topics/${encodeURIComponent(topic)}${suffix}`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
}
