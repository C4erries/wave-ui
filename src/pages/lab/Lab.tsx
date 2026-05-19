import { useTopicLatest } from '@/hooks/useTopicLatest';
import TimeSeriesChart from './TimeSeriesChart';
import SpectrumChart from './SpectrumChart';
import type { DecodedRecord } from '@/lib/recordCodec';

const RAW_TOPIC = 'raw.gen.chA';
const SPECTRUM_TOPIC = 'spectrum.gen.chA';

type StatusLevel = 'ok' | 'nodata' | 'stale' | 'error';

function statusLevel(
  record: DecodedRecord | null,
  isStale: boolean,
  error: string | null,
): StatusLevel {
  if (error) return 'error';
  if (isStale) return 'stale';
  if (!record) return 'nodata';
  return 'ok';
}

function worstStatus(a: StatusLevel, b: StatusLevel): StatusLevel {
  const rank: Record<StatusLevel, number> = { ok: 0, nodata: 1, stale: 2, error: 3 };
  return rank[a] >= rank[b] ? a : b;
}

const STATUS_CONFIG: Record<StatusLevel, { color: string; label: string }> = {
  ok:     { color: '#22c55e', label: 'Подключён' },
  nodata: { color: '#eab308', label: 'Нет данных' },
  stale:  { color: '#f97316', label: 'Подключение нестабильно' },
  error:  { color: '#ef4444', label: 'Ошибка' },
};

function StatusBadge({ level, error }: { level: StatusLevel; error?: string | null }) {
  const { color, label } = STATUS_CONFIG[level];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color, fontSize: 18 }}>●</span>
      <span>{label}{level === 'error' && error ? `: ${error}` : ''}</span>
    </div>
  );
}

function formatTimestamp(ns: bigint): string {
  const ms = Number(ns / 1_000_000n);
  return new Date(ms).toISOString().replace('T', ' ').slice(0, 23);
}

export default function Lab() {
  const raw = useTopicLatest(RAW_TOPIC);
  const spec = useTopicLatest(SPECTRUM_TOPIC);

  const rawLevel = statusLevel(raw.record, raw.isStale, raw.error);
  const specLevel = statusLevel(spec.record, spec.isStale, spec.error);
  const overall = worstStatus(rawLevel, specLevel);
  const displayError = raw.error ?? spec.error ?? null;

  return (
    <div className="layout-grid">
      <div className="card topbar">
        <h1 style={{ margin: 0 }}>Лаборатория</h1>
        <StatusBadge level={overall} error={displayError} />
      </div>

      {raw.record && (
        <div className="card">
          <div className="stats-grid">
            <div className="stat-item">
              <span className="muted">Timestamp</span>
              <span>{formatTimestamp(raw.record.timestampNs)}</span>
            </div>
            <div className="stat-item">
              <span className="muted">Sample rate</span>
              <span>{raw.record.sampleRateHz.toLocaleString()} Гц</span>
            </div>
            <div className="stat-item">
              <span className="muted">Channel ID</span>
              <span>{raw.record.channelId}</span>
            </div>
            <div className="stat-item">
              <span className="muted">Source ID</span>
              <span>{raw.record.sourceId}</span>
            </div>
            <div className="stat-item">
              <span className="muted">Сэмплов (raw)</span>
              <span>{raw.record.nSamples}</span>
            </div>
            {spec.record && (
              <div className="stat-item">
                <span className="muted">Бинов (спектр)</span>
                <span>{spec.record.nSamples}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="layout-grid two">
        <div className="chart-card">
          <h3 style={{ marginTop: 0 }}>Временной сигнал</h3>
          {raw.record ? (
            <TimeSeriesChart samples={raw.record.samples} sampleRateHz={raw.record.sampleRateHz} />
          ) : (
            <p className="muted">{raw.error ? `Ошибка: ${raw.error}` : 'Загрузка...'}</p>
          )}
        </div>
        <div className="chart-card">
          <h3 style={{ marginTop: 0 }}>Спектр</h3>
          {spec.record ? (
            <SpectrumChart samples={spec.record.samples} sampleRateHz={spec.record.sampleRateHz} />
          ) : (
            <p className="muted">{spec.error ? `Ошибка: ${spec.error}` : 'Загрузка...'}</p>
          )}
        </div>
      </div>

      <p className="muted" style={{ textAlign: 'center', fontSize: 12 }}>
        обновляется каждые 400 мс
      </p>
    </div>
  );
}
