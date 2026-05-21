export type GraphNode = {
  id: string;
  name: string;
  kind: 'source' | 'operator';
  type: string;
  params: Record<string, string | number | boolean>;
  x?: number;
  y?: number;
};

export type GraphConfig = {
  name: string;
  broker: string;
  sources: Array<{ name: string; type: string; params: Record<string, unknown> }>;
  operators: Array<{ name: string; type: string; params: Record<string, unknown> }>;
};

export type ConfigSummary = { name: string; filename: string };

export type OrchestratorProcess = {
  name: string;
  type: string;
  kind: string;
  pid: number;
  alive: boolean;
};

export type OrchestratorStatus = {
  mode: string | null;
  processes: OrchestratorProcess[];
};

// ---------------------------------------------------------------------------
// Node type catalogue (used to drive form dropdowns + defaults)
// ---------------------------------------------------------------------------

export type ParamDef = {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
  defaultValue: string | number;
};

export type NodeTypeDef = {
  kind: 'source' | 'operator';
  type: string;
  label: string;
  params: ParamDef[];
};

export const NODE_CATALOGUE: NodeTypeDef[] = [
  {
    kind: 'source',
    type: 'synth',
    label: 'Синтетик (wave-gen)',
    params: [
      { key: 'waveform', label: 'Форма волны', type: 'select', options: ['sine', 'noise', 'chirp'], defaultValue: 'sine' },
      { key: 'freq', label: 'Частота (Гц)', type: 'number', defaultValue: 1000 },
      { key: 'topic', label: 'Топик', type: 'text', defaultValue: 'raw.gen.chA' },
      { key: 'rate', label: 'Частота публ. (Гц)', type: 'number', defaultValue: 10 },
    ],
  },
  {
    kind: 'source',
    type: 'osc',
    label: 'Осциллограф (wave-osc)',
    params: [
      { key: 'source', label: 'Источник', type: 'select', options: ['synth', 'real'], defaultValue: 'synth' },
      { key: 'topic', label: 'Топик', type: 'text', defaultValue: 'raw.osc.chA' },
      { key: 'synth_waveform', label: 'Форма волны (synth)', type: 'select', options: ['sine', 'noise', 'chirp'], defaultValue: 'sine' },
      { key: 'synth_freq', label: 'Частота synth (Гц)', type: 'number', defaultValue: 1000 },
    ],
  },
  {
    kind: 'operator',
    type: 'fft',
    label: 'FFT (wave-fft)',
    params: [
      { key: 'input_topic', label: 'Входной топик', type: 'text', defaultValue: 'raw.gen.chA' },
      { key: 'output_topic', label: 'Выходной топик', type: 'text', defaultValue: 'spectrum.gen.chA' },
      { key: 'group_id', label: 'Group ID', type: 'text', defaultValue: 'fft-gen-chA' },
    ],
  },
  {
    kind: 'operator',
    type: 'stats',
    label: 'Stats (wave-stats)',
    params: [
      { key: 'input_topic', label: 'Входной топик', type: 'text', defaultValue: 'raw.gen.chA' },
      { key: 'output_topic', label: 'Выходной топик', type: 'text', defaultValue: 'stats.gen.chA' },
      { key: 'group_id', label: 'Group ID', type: 'text', defaultValue: 'stats-gen-chA' },
    ],
  },
  {
    kind: 'operator',
    type: 'filter',
    label: 'Filter (wave-filter)',
    params: [
      { key: 'input_topic', label: 'Входной топик', type: 'text', defaultValue: 'raw.gen.chA' },
      { key: 'output_topic', label: 'Выходной топик', type: 'text', defaultValue: 'filtered.gen.chA' },
      { key: 'group_id', label: 'Group ID', type: 'text', defaultValue: 'filter-gen-chA' },
      { key: 'low_hz', label: 'Нижняя граница (Гц)', type: 'number', defaultValue: 500 },
      { key: 'high_hz', label: 'Верхняя граница (Гц)', type: 'number', defaultValue: 1500 },
    ],
  },
  {
    kind: 'operator',
    type: 'threshold',
    label: 'Threshold (wave-threshold)',
    params: [
      { key: 'input_topic', label: 'Входной топик', type: 'text', defaultValue: 'raw.gen.chA' },
      { key: 'output_topic', label: 'Выходной топик', type: 'text', defaultValue: 'events.gen.chA' },
      { key: 'group_id', label: 'Group ID', type: 'text', defaultValue: 'threshold-gen-chA' },
      { key: 'threshold_mv', label: 'Порог (mv)', type: 'number', defaultValue: 0.8 },
    ],
  },
];

export function getNodeTypeDef(kind: 'source' | 'operator', type: string): NodeTypeDef | undefined {
  return NODE_CATALOGUE.find((d) => d.kind === kind && d.type === type);
}

export function defaultParamsFor(kind: 'source' | 'operator', type: string): Record<string, string | number | boolean> {
  const def = getNodeTypeDef(kind, type);
  if (!def) return {};
  return Object.fromEntries(def.params.map((p) => [p.key, p.defaultValue]));
}

// ---------------------------------------------------------------------------
// Graph ↔ API conversion
// ---------------------------------------------------------------------------

export function buildApiPayload(name: string, broker: string, nodes: GraphNode[]): GraphConfig {
  return {
    name,
    broker,
    sources: nodes
      .filter((n) => n.kind === 'source')
      .map(({ name: n, type, params }) => ({ name: n, type, params })),
    operators: nodes
      .filter((n) => n.kind === 'operator')
      .map(({ name: n, type, params }) => ({ name: n, type, params })),
  };
}

export function configToNodes(cfg: GraphConfig): GraphNode[] {
  const sources = (cfg.sources ?? []).map((s, i) => ({
    id: `src-${i}-${s.name}`,
    name: s.name,
    kind: 'source' as const,
    type: s.type,
    params: s.params as Record<string, string | number | boolean>,
    x: 80,
    y: 80 + i * 160,
  }));
  const operators = (cfg.operators ?? []).map((o, i) => ({
    id: `op-${i}-${o.name}`,
    name: o.name,
    kind: 'operator' as const,
    type: o.type,
    params: o.params as Record<string, string | number | boolean>,
    x: 380,
    y: 80 + i * 160,
  }));
  return [...sources, ...operators];
}

// ---------------------------------------------------------------------------
// YAML preview (human-readable, not for /apply)
// ---------------------------------------------------------------------------

export function graphToYaml(name: string, broker: string, nodes: GraphNode[]): string {
  const payload = buildApiPayload(name, broker, nodes);
  let out = `name: "${payload.name}"\nbroker: "${payload.broker}"\n`;

  if (payload.sources.length > 0) {
    out += '\nsources:\n';
    for (const s of payload.sources) {
      out += `  - name: ${s.name}\n    type: ${s.type}\n`;
      const entries = Object.entries(s.params);
      if (entries.length > 0) {
        out += '    params:\n';
        for (const [k, v] of entries) out += `      ${k}: ${v}\n`;
      }
    }
  }

  if (payload.operators.length > 0) {
    out += '\noperators:\n';
    for (const o of payload.operators) {
      out += `  - name: ${o.name}\n    type: ${o.type}\n`;
      const entries = Object.entries(o.params);
      if (entries.length > 0) {
        out += '    params:\n';
        for (const [k, v] of entries) out += `      ${k}: ${v}\n`;
      }
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Edge inference (for schema view)
// ---------------------------------------------------------------------------

export type InferredEdge = { id: string; sourceId: string; targetId: string; label: string };

export function inferEdges(nodes: GraphNode[]): InferredEdge[] {
  const edges: InferredEdge[] = [];
  const sources = nodes.filter((n) => n.kind === 'source');
  const operators = nodes.filter((n) => n.kind === 'operator');

  for (const op of operators) {
    const inputTopic = String(op.params.input_topic ?? '');
    if (!inputTopic) continue;
    for (const src of sources) {
      const outputTopic = String(src.params.topic ?? src.params.output_topic ?? '');
      if (outputTopic && outputTopic === inputTopic) {
        edges.push({
          id: `e-${src.id}-${op.id}`,
          sourceId: src.id,
          targetId: op.id,
          label: inputTopic,
        });
      }
    }
    // operator → operator edges (output_topic → input_topic)
    for (const other of operators) {
      if (other.id === op.id) continue;
      const otherOut = String(other.params.output_topic ?? '');
      if (otherOut && otherOut === inputTopic) {
        edges.push({
          id: `e-${other.id}-${op.id}`,
          sourceId: other.id,
          targetId: op.id,
          label: inputTopic,
        });
      }
    }
  }
  return edges;
}

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

let _idCounter = 0;
export function newNodeId(): string {
  return `node-${Date.now()}-${_idCounter++}`;
}
