import { useEffect, useCallback, useState, useMemo } from 'react';
import  {ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import getLayoutedElements from '../../../components/layoutDagre';
import CargoNode from '../../../components/CargoNode';
import { useOrganigrama } from '../../../hooks/useOrganigrama';

function OrganigramaInner() {
  const { data, loading, error, recargar } = useOrganigrama();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView } = useReactFlow();

  const nodeTypes = useMemo(() => ({ cargo: CargoNode }), []);

  // Cuando llegan datos nuevos, aplica Dagre
  useEffect(() => {
    if (!data.nodes.length) return;

    const conJefe = new Set(data.edges.map((e) => e.target));
    const rawNodes = data.nodes.map((n) => ({
      ...n,
      type: 'cargo',
      data: { ...n.data, tieneJefe: conJefe.has(n.id) },
    }));

    const { nodes: ln, edges: le } = getLayoutedElements(rawNodes, data.edges);
    setNodes(ln);
    setEdges(le);

    requestAnimationFrame(() => fitView({ padding: 0.2, duration: 400 }));
  }, [data, setNodes, setEdges, fitView]);

  const onLayout = useCallback(
    (direction) => {
      const { nodes: ln, edges: le } = getLayoutedElements(nodes, edges, direction);
      setNodes([...ln]);
      setEdges([...le]);
      requestAnimationFrame(() => fitView({ duration: 400 }));
    },
    [nodes, edges, setNodes, setEdges, fitView]
  );

  if (loading) {
    return <div style={centered}>Cargando organigrama…</div>;
  }

  if (error) {
    return (
      <div style={centered}>
        <div style={{ color: '#dc2626', fontWeight: 600 }}>{error}</div>
        <button onClick={recargar} style={{ ...btnStyle, marginTop: 16 }}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={toolbar}>
        <button onClick={() => onLayout('TB')} style={btnStyle}>↕ Vertical</button>
        <button onClick={() => onLayout('LR')} style={btnStyle}>↔ Horizontal</button>
        <button onClick={recargar} style={btnStyle}>⟳ Refrescar</button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} color="#e5e7eb" />
        <MiniMap pannable zoomable />
        <Controls />
      </ReactFlow>
    </div>
  );
}

const centered = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'system-ui, sans-serif',
};

const toolbar = {
  position: 'absolute',
  top: 12,
  left: 12,
  zIndex: 10,
  display: 'flex',
  gap: 8,
};

const btnStyle = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  background: '#fff',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: 13,
  boxShadow: '0 1px 3px rgba(0,0,0,.08)',
  fontFamily: 'system-ui, sans-serif',
};

export default function Organigrama() {
  return (
    <ReactFlowProvider>
      <OrganigramaInner />
    </ReactFlowProvider>
  );
}