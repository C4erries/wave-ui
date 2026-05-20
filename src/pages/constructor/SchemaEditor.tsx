import { useCallback, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from 'reactflow';
import 'reactflow/dist/style.css';

import type { GraphNode } from './graphUtils';
import { inferEdges, defaultParamsFor, newNodeId } from './graphUtils';
import NodeCard from './NodeCard';

interface Props {
  nodes: GraphNode[];
  onNodesChange: (nodes: GraphNode[]) => void;
  selectedId: string | null;
  onSelectNode: (id: string | null) => void;
}

const SRC_COLOR = '#3be0b4';
const OP_COLOR = '#ffb347';

function toRFNodes(graphNodes: GraphNode[]): Node[] {
  return graphNodes.map((n) => {
    const color = n.kind === 'source' ? SRC_COLOR : OP_COLOR;
    const keyParam =
      n.kind === 'source'
        ? String(n.params.topic ?? '')
        : String(n.params.input_topic ?? '') + ' → ' + String(n.params.output_topic ?? '');
    return {
      id: n.id,
      position: { x: n.x ?? (n.kind === 'source' ? 80 : 380), y: n.y ?? 80 },
      data: { label: `${n.name}\n${n.type}\n${keyParam}` },
      style: {
        background: color + '18',
        border: `2px solid ${color}`,
        borderRadius: 10,
        color: 'var(--text, #e6edf7)',
        fontSize: 12,
        padding: '10px 14px',
        whiteSpace: 'pre',
        minWidth: 160,
        cursor: 'pointer',
      },
    };
  });
}

function toRFEdges(graphNodes: GraphNode[]): Edge[] {
  return inferEdges(graphNodes).map((e) => ({
    id: e.id,
    source: e.sourceId,
    target: e.targetId,
    label: e.label,
    style: { stroke: '#9fb1d0', strokeWidth: 2 },
    labelStyle: { fill: '#9fb1d0', fontSize: 11 },
  }));
}

export default function SchemaEditor({ nodes, onNodesChange, selectedId, onSelectNode }: Props) {
  const [rfNodes, setRFNodes, onRFNodesChange] = useNodesState(toRFNodes(nodes));
  const [rfEdges, setRFEdges, onRFEdgesChange] = useEdgesState(toRFEdges(nodes));

  // Sync graph nodes → RF nodes (when form editor changes the model)
  useEffect(() => {
    setRFNodes(toRFNodes(nodes));
    setRFEdges(toRFEdges(nodes));
  }, [nodes, setRFNodes, setRFEdges]);

  // When the user drags a node, persist its new position into the graph model
  const handleNodeDragStop = useCallback(
    (_: React.MouseEvent, rfNode: Node) => {
      onNodesChange(
        nodes.map((n) =>
          n.id === rfNode.id ? { ...n, x: rfNode.position.x, y: rfNode.position.y } : n,
        ),
      );
    },
    [nodes, onNodesChange],
  );

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, rfNode) => {
      onSelectNode(rfNode.id === selectedId ? null : rfNode.id);
    },
    [selectedId, onSelectNode],
  );

  function addNode(kind: 'source' | 'operator') {
    const type = kind === 'source' ? 'synth' : 'fft';
    const params = defaultParamsFor(kind, type);
    const idx = nodes.filter((n) => n.kind === kind).length;
    const name =
      kind === 'source'
        ? `gen_ch${String.fromCharCode(65 + idx)}`
        : `fft_ch${String.fromCharCode(65 + idx)}`;
    const x = kind === 'source' ? 80 : 380;
    const y = 80 + idx * 160;
    const newNode: GraphNode = { id: newNodeId(), name, kind, type, params, x, y };
    onNodesChange([...nodes, newNode]);
  }

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  function handleSelectedChange(updated: GraphNode) {
    onNodesChange(nodes.map((n) => (n.id === updated.id ? { ...updated, x: n.x, y: n.y } : n)));
  }

  function handleDelete(id: string) {
    onNodesChange(nodes.filter((n) => n.id !== id));
    if (selectedId === id) onSelectNode(null);
  }

  return (
    <div style={{ display: 'flex', gap: 16, height: 520 }}>
      {/* React Flow canvas */}
      <div style={{ flex: 1, border: '1px solid var(--border, #1f2a45)', borderRadius: 10, overflow: 'hidden', background: 'var(--card, #131d3a)' }}>
        <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--border, #1f2a45)' }}>
          <button
            onClick={() => addNode('source')}
            style={{
              padding: '4px 12px',
              border: `1px solid ${SRC_COLOR}88`,
              borderRadius: 6,
              background: SRC_COLOR + '18',
              color: SRC_COLOR,
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            + Источник
          </button>
          <button
            onClick={() => addNode('operator')}
            style={{
              padding: '4px 12px',
              border: `1px solid ${OP_COLOR}88`,
              borderRadius: 6,
              background: OP_COLOR + '18',
              color: OP_COLOR,
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            + Оператор
          </button>
          <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto', alignSelf: 'center' }}>
            Клик по ноде — открыть редактор
          </span>
        </div>
        <div style={{ height: 'calc(100% - 42px)' }}>
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            onNodesChange={onRFNodesChange}
            onEdgesChange={onRFEdgesChange}
            onNodeDragStop={handleNodeDragStop}
            onNodeClick={handleNodeClick}
            fitView
          >
            <Controls />
            <Background color="#1f2a45" gap={20} />
          </ReactFlow>
        </div>
      </div>

      {/* Right panel: node editor */}
      <div
        style={{
          width: 300,
          flexShrink: 0,
          overflowY: 'auto',
          border: '1px solid var(--border, #1f2a45)',
          borderRadius: 10,
          padding: 14,
          background: 'var(--card, #131d3a)',
        }}
      >
        {selectedNode ? (
          <>
            <h4 style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--muted)' }}>Редактор узла</h4>
            <NodeCard
              node={selectedNode}
              onChange={handleSelectedChange}
              onDelete={() => handleDelete(selectedNode.id)}
            />
          </>
        ) : (
          <p style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
            Выберите узел на схеме для редактирования
          </p>
        )}
      </div>
    </div>
  );
}
