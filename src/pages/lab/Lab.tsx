import { useSearchParams } from 'react-router-dom';
import { useTopicLatest } from '@/hooks/useTopicLatest';
import TimeSeriesChart from './TimeSeriesChart';
import SpectrumChart from './SpectrumChart';
import type { DecodedRecord } from '@/lib/recordCodec';

type SourceKey = 'gen' | 'osc';

const SOURCES: Record<SourceKey, { label: string; raw: string; spectrum: string }> = {
  gen: { label: 'Синтетика (gen)', raw: 'raw.gen.chA', spectrum: 'spectrum.gen.chA' },
  osc: { label: 'Осциллограф (osc)', raw: 'raw.osc.chA', spectrum: 'spectrum.osc.chA' },
};

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

function TopicNotFoundMessage({ sourceKey }: { sourceKey: SourceKey }) {
  const isOsc = sourceKey === 'osc';
  return (
    <div className="card" style={{ color: '#f97316' }}>
      {isOsc
        ? 'Топики осциллографа не созданы. Запустите wave-osc или создайте топики вручную через mbctl.'
        : `Топики источника «${SOURCES[sourceKey].label}» не найдены на брокере.`}
    </div>
  );
}

export default function Lab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSource = searchParams.get('source');
  const sourceKey: SourceKey = rawSource === 'osc' ? 'osc' : 'gen';
  const source = SOURCES[sourceKey];

  const raw = useTopicLatest(source.raw);
  const spec = useTopicLatest(source.spectrum);

  const topicsNotFound = raw.topicNotFound || spec.topicNotFound;

  const rawLevel = statusLevel(raw.record, raw.isStale, raw.error);
  const specLevel = statusLevel(spec.record, spec.isStale, spec.error);
  const overall = topicsNotFound ? 'nodata' : worstStatus(rawLevel, specLevel);
  const displayError = raw.error ?? spec.error ?? null;

  function handleSourceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSearchParams({ source: e.target.value });
  }

  return (
    <div className="layout-grid">
      <div className="card topbar">
        <h1 style={{ margin: 0 }}>Лаборатория</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
            <span className="muted">Источник:</span>
            <select
              value={sourceKey}
              onChange={handleSourceChange}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                border: '1px solid var(--border, #333)',
                background: 'var(--card-bg, #1a1a1a)',
                color: 'inherit',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {(Object.keys(SOURCES) as SourceKey[]).map((k) => (
                <option key={k} value={k}>{SOURCES[k].label}</option>
              ))}
            </select>
          </label>
          <StatusBadge level={overall} error={displayError} />
        </div>
      </div>

      {topicsNotFound && <TopicNotFoundMessage sourceKey={sourceKey} />}

      {!topicsNotFound && raw.record && (
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

      {!topicsNotFound && (
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
      )}

      <p className="muted" style={{ textAlign: 'center', fontSize: 12 }}>
        обновляется каждые 400 мс · топики: {source.raw}, {source.spectrum}
      </p>
    </div>
  );
}
