import { useEffect, useRef, useState } from 'react';

import {
  fetchOrchestratorStatus,
  fetchConfigs,
  fetchConfig,
  applyGraph,
  orchestratorBaseURL,
} from '@/api/orchestratorApi';
import type { GraphNode, OrchestratorStatus, ConfigSummary } from './graphUtils';
import { buildApiPayload, configToNodes, defaultParamsFor, newNodeId } from './graphUtils';
import FormEditor from './FormEditor';
import SchemaEditor from './SchemaEditor';

type Tab = 'form' | 'schema';

const DEFAULT_NODES: GraphNode[] = [
  {
    id: newNodeId(),
    name: 'gen_chA',
    kind: 'source',
    type: 'synth',
    params: defaultParamsFor('source', 'synth'),
    x: 80,
    y: 80,
  },
  {
    id: newNodeId(),
    name: 'fft_chA',
    kind: 'operator',
    type: 'fft',
    params: { input_topic: 'raw.gen.chA', output_topic: 'spectrum.gen.chA', group_id: 'fft-gen-chA' },
    x: 380,
    y: 80,
  },
];

function StatusBar({ status, offline }: { status: OrchestratorStatus | null; offline: boolean }) {
  if (offline) {
    return (
      <div
        style={{
          background: 'rgba(255,107,107,0.12)',
          border: '1px solid var(--danger, #ff6b6b)',
          borderRadius: 8,
          padding: '8px 14px',
          fontSize: 13,
          color: 'var(--danger, #ff6b6b)',
        }}
      >
        ⚠ Оркестратор не запущен. Запустите:{' '}
        <code style={{ fontSize: 12 }}>wave-orchestrator start --serve-api</code>
        {' '}(по умолчанию порт 8099, настраивается через <code>VITE_ORCHESTRATOR_URL</code>)
      </div>
    );
  }
  if (!status) return null;

  const alive = status.processes.filter((p) => p.alive).length;
  const total = status.processes.length;
  const modeLabel = status.mode ? `Режим: ${status.mode}` : 'Не запущен';
  const color = status.mode ? 'var(--accent, #3be0b4)' : 'var(--muted)';

  return (
    <div
      style={{
        background: 'var(--card, #131d3a)',
        border: '1px solid var(--border, #1f2a45)',
        borderRadius: 8,
        padding: '8px 14px',
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ color, fontWeight: 600 }}>{modeLabel}</span>
      {status.mode && (
        <span style={{ color: 'var(--muted)' }}>
          процессов: {total} (alive: {alive})
        </span>
      )}
      {status.processes.length > 0 && (
        <span style={{ color: 'var(--muted)', fontSize: 11 }}>
          {status.processes.map((p) => `${p.name}(${p.alive ? '▲' : '▼'})`).join('  ')}
        </span>
      )}
    </div>
  );
}

export default function Constructor() {
  const [tab, setTab] = useState<Tab>('form');
  const [graphName, setGraphName] = useState('custom');
  const [broker, setBroker] = useState('127.0.0.1:7912');
  const [nodes, setNodes] = useState<GraphNode[]>(DEFAULT_NODES);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [orchStatus, setOrchStatus] = useState<OrchestratorStatus | null>(null);
  const [orchOffline, setOrchOffline] = useState(false);

  const [configs, setConfigs] = useState<ConfigSummary[]>([]);
  const [selectedPreset, setSelectedPreset] = useState('');

  const [applyResult, setApplyResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [applying, setApplying] = useState(false);
  const applyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Poll orchestrator status
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const s = await fetchOrchestratorStatus();
        if (!cancelled) { setOrchStatus(s); setOrchOffline(false); }
      } catch {
        if (!cancelled) setOrchOffline(true);
      }
    }
    poll();
    const id = setInterval(poll, 2500);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Load preset list
  useEffect(() => {
    fetchConfigs()
      .then(setConfigs)
      .catch(() => { /* orchestrator offline — ignore */ });
  }, [orchOffline]);

  async function handleLoadPreset() {
    if (!selectedPreset) return;
    try {
      const cfg = await fetchConfig(selectedPreset);
      setGraphName(cfg.name);
      if (cfg.broker) setBroker(cfg.broker);
      setNodes(configToNodes(cfg));
      setSelectedId(null);
    } catch (e) {
      alert(`Не удалось загрузить конфиг: ${String(e)}`);
    }
  }

  async function handleApply() {
    setApplying(true);
    setApplyResult(null);
    if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
    try {
      const payload = buildApiPayload(graphName, broker, nodes);
      const res = await applyGraph(payload);
      setApplyResult({ ok: true, msg: `Применён режим «${res.mode}»` });
    } catch (e) {
      setApplyResult({ ok: false, msg: String(e) });
    } finally {
      setApplying(false);
      applyTimerRef.current = setTimeout(() => setApplyResult(null), 5000);
    }
  }

  function handleReset() {
    setGraphName('custom');
    setBroker('127.0.0.1:7912');
    setNodes(DEFAULT_NODES);
    setSelectedId(null);
    setApplyResult(null);
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 18px',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: active ? 600 : 400,
    background: active ? 'var(--accent, #3be0b4)22' : 'transparent',
    color: active ? 'var(--accent, #3be0b4)' : 'var(--muted)',
    fontSize: 14,
    transition: 'all 0.15s',
  });

  return (
    <div className="layout-grid">
      {/* Topbar */}
      <div className="card topbar">
        <h1 style={{ margin: 0 }}>Конструктор</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Tab switcher */}
          <div
            style={{
              display: 'flex',
              gap: 4,
              background: 'var(--bg-soft, #0f162d)',
              padding: 4,
              borderRadius: 10,
              border: '1px solid var(--border, #1f2a45)',
            }}
          >
            <button style={tabStyle(tab === 'form')} onClick={() => setTab('form')}>Форма</button>
            <button style={tabStyle(tab === 'schema')} onClick={() => setTab('schema')}>Схема</button>
          </div>

          {/* Apply / Reset */}
          <button
            onClick={handleApply}
            disabled={applying || orchOffline}
            style={{
              padding: '6px 18px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--accent, #3be0b4)',
              color: '#0a0f1f',
              fontWeight: 700,
              cursor: applying || orchOffline ? 'not-allowed' : 'pointer',
              opacity: applying || orchOffline ? 0.5 : 1,
              fontSize: 14,
            }}
          >
            {applying ? 'Применяется...' : 'Применить'}
          </button>
          <button
            onClick={handleReset}
            style={{
              padding: '6px 18px',
              borderRadius: 8,
              border: '1px solid var(--border, #1f2a45)',
              background: 'transparent',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            Сбросить
          </button>
        </div>
      </div>

      {/* Apply feedback */}
      {applyResult && (
        <div
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            fontSize: 13,
            background: applyResult.ok ? 'rgba(59,224,180,0.1)' : 'rgba(255,107,107,0.1)',
            border: `1px solid ${applyResult.ok ? 'var(--accent, #3be0b4)' : 'var(--danger, #ff6b6b)'}44`,
            color: applyResult.ok ? 'var(--accent, #3be0b4)' : 'var(--danger, #ff6b6b)',
          }}
        >
          {applyResult.ok ? '✓ ' : '✗ '}{applyResult.msg}
        </div>
      )}

      {/* Orchestrator status */}
      <StatusBar status={orchStatus} offline={orchOffline} />

      {/* Preset loader */}
      {configs.length > 0 && (
        <div
          className="card"
          style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 16px' }}
        >
          <span style={{ fontSize: 13, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Пресет:</span>
          <select
            value={selectedPreset}
            onChange={(e) => setSelectedPreset(e.target.value)}
            style={{
              background: 'var(--bg-soft, #0f162d)',
              border: '1px solid var(--border, #1f2a45)',
              borderRadius: 6,
              color: 'inherit',
              padding: '4px 8px',
              fontSize: 13,
              flex: 1,
              minWidth: 160,
            }}
          >
            <option value="">— выберите —</option>
            {configs.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={handleLoadPreset}
            disabled={!selectedPreset}
            style={{
              padding: '4px 14px',
              border: '1px solid var(--border, #1f2a45)',
              borderRadius: 6,
              background: 'transparent',
              color: selectedPreset ? 'var(--text)' : 'var(--muted)',
              cursor: selectedPreset ? 'pointer' : 'not-allowed',
              fontSize: 13,
            }}
          >
            Загрузить
          </button>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            загрузка заменяет текущий граф
          </span>
        </div>
      )}

      {/* Main editor */}
      {tab === 'form' ? (
        <FormEditor
          graphName={graphName}
          broker={broker}
          nodes={nodes}
          onGraphNameChange={setGraphName}
          onBrokerChange={setBroker}
          onNodesChange={setNodes}
        />
      ) : (
        <SchemaEditor
          nodes={nodes}
          onNodesChange={setNodes}
          selectedId={selectedId}
          onSelectNode={setSelectedId}
        />
      )}

      <p className="muted" style={{ textAlign: 'center', fontSize: 11 }}>
        Оркестратор: {orchestratorBaseURL}
      </p>
    </div>
  );
}
