import type { GraphNode, ParamDef } from './graphUtils';
import { getNodeTypeDef, NODE_CATALOGUE } from './graphUtils';

interface Props {
  node: GraphNode;
  onChange: (updated: GraphNode) => void;
  onDelete: () => void;
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

function ParamField({
  def,
  value,
  onChange,
}: {
  def: ParamDef;
  value: string | number | boolean;
  onChange: (v: string | number) => void;
}) {
  if (def.type === 'select') {
    return (
      <select
        style={inputStyle}
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
      >
        {(def.options ?? []).map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    );
  }
  if (def.type === 'number') {
    return (
      <input
        type="number"
        style={inputStyle}
        value={String(value)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    );
  }
  return (
    <input
      type="text"
      style={inputStyle}
      value={String(value)}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export default function NodeCard({ node, onChange, onDelete }: Props) {
  const def = getNodeTypeDef(node.kind, node.type);
  const kindColor = node.kind === 'source' ? 'var(--accent, #3be0b4)' : 'var(--accent-2, #ffb347)';

  const availableTypes = NODE_CATALOGUE.filter((d) => d.kind === node.kind);

  function handleTypeChange(newType: string) {
    const newDef = NODE_CATALOGUE.find((d) => d.kind === node.kind && d.type === newType);
    const newParams = newDef
      ? Object.fromEntries(newDef.params.map((p) => [p.key, p.defaultValue]))
      : {};
    onChange({ ...node, type: newType, params: newParams });
  }

  function handleParam(key: string, value: string | number) {
    onChange({ ...node, params: { ...node.params, [key]: value } });
  }

  return (
    <div
      style={{
        background: 'var(--card, #131d3a)',
        border: `1px solid ${kindColor}44`,
        borderRadius: 10,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            background: kindColor + '22',
            color: kindColor,
            borderRadius: 6,
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          {node.kind}
        </span>
        <input
          type="text"
          style={{ ...inputStyle, fontWeight: 600, flex: 1 }}
          value={node.name}
          placeholder="Имя узла"
          onChange={(e) => onChange({ ...node, name: e.target.value })}
        />
        <button
          onClick={onDelete}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--danger, #ff6b6b)',
            cursor: 'pointer',
            fontSize: 16,
            padding: '0 4px',
          }}
          title="Удалить узел"
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'grid', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', minWidth: 100 }}>Тип</span>
          <select
            style={inputStyle}
            value={node.type}
            onChange={(e) => handleTypeChange(e.target.value)}
          >
            {availableTypes.map((d) => (
              <option key={d.type} value={d.type}>{d.label}</option>
            ))}
          </select>
        </div>

        {(def?.params ?? []).map((p) => (
          <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', minWidth: 100 }}>{p.label}</span>
            <ParamField
              def={p}
              value={node.params[p.key] ?? p.defaultValue}
              onChange={(v) => handleParam(p.key, v)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
