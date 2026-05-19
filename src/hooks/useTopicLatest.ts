import { useEffect, useRef, useState } from 'react';
import { fetchTopicDetails, fetchMessages } from '@/api/brokerApi';
import { decodeRecord } from '@/lib/recordCodec';
import type { DecodedRecord } from '@/lib/recordCodec';

export function useTopicLatest(
  topic: string,
  options?: { intervalMs?: number; enabled?: boolean },
) {
  const intervalMs = options?.intervalMs ?? 400;
  const enabled = (options?.enabled ?? true) && !!topic;

  const [record, setRecord] = useState<DecodedRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const lastOffsetRef = useRef<number | null>(null);
  const lastUpdatedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    lastOffsetRef.current = null;
    lastUpdatedAtRef.current = null;

    async function poll() {
      if (lastOffsetRef.current === null) {
        try {
          const details = await fetchTopicDetails(topic);
          const hwm = details.partitions[0]?.highWatermark ?? -1;
          if (hwm < 0) return;
          lastOffsetRef.current = Math.max(0, hwm - 1);
        } catch (e) {
          if (!cancelled) setError(String(e));
        }
        return;
      }

      try {
        const msgs = await fetchMessages(topic, {
          partition: 0,
          offset: lastOffsetRef.current,
          limit: 1,
        });
        if (cancelled) return;

        if (msgs.length === 0) {
          if (
            lastUpdatedAtRef.current !== null &&
            Date.now() - lastUpdatedAtRef.current > 2 * intervalMs
          ) {
            setIsStale(true);
          }
          return;
        }

        const msg = msgs[msgs.length - 1];
        const decoded = decodeRecord(msg.value);
        lastOffsetRef.current = msg.offset + 1;
        const now = Date.now();
        lastUpdatedAtRef.current = now;
        setRecord(decoded);
        setLastUpdatedAt(now);
        setIsStale(false);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    }

    const id = setInterval(poll, intervalMs);
    poll();

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [topic, enabled, intervalMs]);

  return { record, error, isStale, lastUpdatedAt };
}
