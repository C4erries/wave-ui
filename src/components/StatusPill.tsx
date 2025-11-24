import type { BrokerHealth } from '@/types';

type Props =
  | { status: BrokerHealth['status']; label?: string }
  | { status: 'ok' | 'error'; label?: string };

export default function StatusPill({ status, label }: Props) {
  const isOk = status === 'up' || status === 'ok';
  const classes = `pill ${isOk ? 'success' : status === 'down' ? 'danger' : ''}`;
  return (
    <span className={classes}>
      <span className={`status-dot ${isOk ? 'status-ok' : 'status-bad'}`} />
      {label ?? (isOk ? 'Healthy' : 'Degraded')}
    </span>
  );
}
