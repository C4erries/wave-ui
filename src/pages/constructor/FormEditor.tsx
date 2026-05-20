import type { GraphNode } from './graphUtils';
import { defaultParamsFor, graphToYaml, newNodeId } from './graphUtils';
import NodeCard from './NodeCard';

interface Props {
  graphName: string;
  broker: string;
  nodes: GraphNode[];
  onGraphNameChange: (v: string) => void;
  onBrokerChange: (v: string) => void;
  onNodesChange: (nodes: GraphNode[]) => void;
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-soft, #0f162d)',
  border: '1px solid var(--border, #1f2a45)',
  borderRadius: 6,
  color: 'inherit',
  padding: '4px 8px',
  fontSize: 13,
  width: '100%',
  boxSizing: 'border-box',
};

function addBtnStyle(accent: string): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    border: `1px dashed ${accent}88`,
    borderRadius: 8,
    background: 'transparent',
    color: accent,
    cursor: 'pointer',
    fontSize: 13,
    alignSelf: 'flex-start',
  };
}

export default function FormEditor({
  graphName,
  broker,
  nodes,
  onGraphNameChange,
  onBrokerChange,
  onNodesChange,
}: Props) {
  const sources = nodes.filter((n) => n.kind === 'source');
  const operators = nodes.filter((n) => n.kind === 'operator');

  function addNode(kind: 'source' | 'operator') {
    const type = kind === 'source' ? 'synth' : 'fft';
    const params = defaultParamsFor(kind, type);
    const idx = nodes.filter((n) => n.kind === kind).length;
    const name = kind === 'source' ? `gen_ch${String.fromCharCode(65 + idx)}` : `fft_ch${String.fromCharCode(65 + idx)}`;
    const newNode: GraphNode = { id: newNodeId(), name, kind, type, params };
    onNodesChange([...nodes, newNode]);
  }

  function updateNode(id: string, updated: GraphNode) {
    onNodesChange(nodes.map((n) => (n.id === id ? updated : n)));
  }

  function removeNode(id: string) {
    onNodesChange(nodes.filter((n) => n.id !== id));
  }

  const yaml = graphToYaml(graphName, broker, nodes);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Graph metadata */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>Параметры режима</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Имя режима</div>
            <input
              type="text"
              style={inputStyle}
              value={graphName}
              onChange={(e) => onGraphNameChange(e.target.value)}
              placeholder="custom"
            />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Брокер</div>
            <input
              type="text"
              style={inputStyle}
              value={broker}
              onChange={(e) => onBrokerChange(e.target.value)}
              placeholder="127.0.0.1:7912"
            />
          </div>
        </div>
      </div>

      {/* Sources */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 15, color: 'var(--accent)' }}>
          Источники ({sources.length})
        </h3>
        {sources.map((n) => (
          <NodeCard
            key={n.id}
            node={n}
            onChange={(u) => updateNode(n.id, u)}
            onDelete={() => removeNode(n.id)}
          />
        ))}
        <button style={addBtnStyle('var(--accent, #3be0b4)')} onClick={() => addNode('source')}>
          + Добавить источник
        </button>
      </div>

      {/* Operators */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 15, color: 'var(--accent-2)' }}>
          Операторы ({operators.length})
        </h3>
        {operators.map((n) => (
          <NodeCard
            key={n.id}
            node={n}
            onChange={(u) => updateNode(n.id, u)}
            onDelete={() => removeNode(n.id)}
          />
        ))}
        <button style={addBtnStyle('var(--accent-2, #ffb347)')} onClick={() => addNode('operator')}>
          + Добавить оператор
        </button>
      </div>

      {/* YAML preview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h3 style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>Превью YAML</h3>
        <textarea
          readOnly
          value={yaml}
          style={{
            ...inputStyle,
            fontFamily: 'monospace',
            fontSize: 12,
            minHeight: 180,
            resize: 'vertical',
            lineHeight: 1.5,
          }}
        />
      </div>
    </div>
  );
}
