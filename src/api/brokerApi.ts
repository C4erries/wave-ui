import type {
  BrokerInfo,
  BrokerSummary,
  ConsumerGroup,
  Message,
  MessageQuery,
  Topic,
  TopicDetails,
} from '@/types';
import * as mock from './mockBrokerApi';

const baseURL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
  'http://localhost:8090';
const useMocks =
  (import.meta.env.VITE_USE_MOCKS as string | undefined)?.toLowerCase() !== 'false';

async function requestJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseURL}${path}`, init);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchBrokerInfo(): Promise<BrokerInfo> {
  if (useMocks) return mock.getBrokerInfo();
  return requestJSON('/api/broker');
}

export async function fetchBrokerSummary(): Promise<BrokerSummary> {
  if (useMocks) return mock.getBrokerSummary();
  return requestJSON('/api/summary');
}

export async function fetchTopics(): Promise<Topic[]> {
  if (useMocks) return mock.getTopics();
  return requestJSON('/api/topics');
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

  const partition = query.partition ?? 0;
  const params = new URLSearchParams();
  if (query.offset !== undefined) params.set('offset', String(query.offset));
  if (query.limit !== undefined) params.set('limit', String(query.limit));

  return requestJSON(
    `/api/topics/${encodeURIComponent(topic)}/partitions/${partition}/messages?${params.toString()}`,
  );
}

export async function fetchConsumerGroups(): Promise<ConsumerGroup[]> {
  if (useMocks) return mock.getConsumerGroups();
  return requestJSON('/api/consumers');
}
