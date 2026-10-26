import dagre from '@dagrejs/dagre';
import { Position } from '@xyflow/react';

export const NODE_WIDTH = 280;
export const NODE_HEIGHT = 160;

const normalizar = (texto) =>
  String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();

const COLORES_GERENCIA = {
  'DIRECTOR TECNICO': {
    bg: '#ecfeff',
    border: '#06b6d4',
    texto: '#155e75',
  },
  'GERENTE DE ADMINISTRACION Y FINANZAS': {
    bg: '#eff6ff',
    border: '#3b82f6',
    texto: '#1e3a8a',
  },
  'GERENTE DE GESTION DEL TALENTO': {
    bg: '#faf5ff',
    border: '#a855f7',
    texto: '#6b21a8',
  },
  'GERENTE DE OPERACIONES': {
    bg: '#f0fdf4',
    border: '#22c55e',
    texto: '#14532d',
  },
  'GERENTE DE MARKETING': {
    bg: '#fffbeb',
    border: '#fbbf24',
    texto: '#92400e',
  },
  'GERENTE GENERAL': {
    bg: '#fef3c7',
    border: '#f59e0b',
    texto: '#78350f', 
  },
  'SUBGERENTE GENERAL VETERINARIA': {
    bg: '#f3e8ff',
    border: '#a855f7',
    texto: '#6b21a8',
  },
  'SUBGERENTE GENERAL HUMANA': {
    bg: '#fef2f2',
    border: '#ef4444',
    texto: '#7f1d1d',
  },
  'SUBGERENTE GENERAL DE SOPORTE DE NEGOCIO': {
    bg: '#fefce8',
    border: '#facc15',
    texto: '#78350f',
  },
  'SUBGERENTE GENERAL DE BUSINESS INTELIGENCE': {
    bg: '#fefce8',
    border: '#facc15',
    texto: '#78350f',
  },
  'JEFE DE TECNOLOGÍAS DE LA INFORMACIÓN': {
    bg: '#f0fdf4',
    border: '#22c55e',
    texto: '#14532d',
  },
  'JEFE DE PLANIFICACIÓN DE LA DEMANDA ': {
    bg: '#f0fdf4',
    border: '#22c55e',    
texto: '#14532d',
  },
  'JEFE DE COMPRAS E IMPORTACIONES': {
    bg: '#f0fdf4',
    border: '#22c55e',
    texto: '#14532d',
  },      
  'PRESIDENTE': {
    bg: '#fef3c7',
    border: '#f59e0b',
    texto: '#78350f', 
  },
};



export function obtenerColoresPorRama(
  nodes,
  edges,
  coloresPersonalizados = {}
) {
  const colores = new Map();
  const hijos = new Map();
  const pendientes = [];

  const coloresPorNombre = new Map(
    Object.entries(COLORES_GERENCIA).map(([nombre, color]) => [
      normalizar(nombre),
      color,
    ])
  );

  edges.forEach(({ source, target }) => {
    if (!hijos.has(source)) hijos.set(source, []);
    hijos.get(source).push(target);
  });

  nodes.forEach((node) => {
    const color =
      coloresPersonalizados[node.id] ||
      coloresPorNombre.get(normalizar(node.data.label));

    if (color) {
      colores.set(node.id, color);
      pendientes.push(node.id);
    }
  });

  for (let i = 0; i < pendientes.length; i++) {
    const parentId = pendientes[i];

    for (const childId of hijos.get(parentId) || []) {
      if (colores.has(childId)) continue;

      colores.set(childId, colores.get(parentId));
      pendientes.push(childId);
    }
  }

  return colores;
}

export default function getLayoutedElements(
  nodes,
  edges,
  direction = 'TB',
  coloresPersonalizados = {}
) {
  const horizontal = direction === 'LR';

  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));

  graph.setGraph({
    rankdir: direction,
    nodesep: 100,  // Separación entre tarjetas del mismo nivel.
    ranksep: 150,  // Separación entre niveles.
    edgesep: 40,
    marginx: 50,
    marginy: 50,
    ranker: 'network-simplex',
  });

  nodes.forEach((node) => {
    graph.setNode(node.id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  });

  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);
  const coloresPorRama = obtenerColoresPorRama(nodes,edges,coloresPersonalizados);

  return {
    nodes: nodes.map((node) => {
      const { x, y } = graph.node(node.id);

      return {
        ...node,
        sourcePosition: horizontal ? Position.Right : Position.Bottom,
        targetPosition: horizontal ? Position.Left : Position.Top,
        data: {
          ...node.data,
          direction,
          coloresGerencia: coloresPorRama.get(node.id) || null,
        },
        style: {
          ...node.style,
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
        },
        position: {
          x: x - NODE_WIDTH / 2,
          y: y - NODE_HEIGHT / 2,
        },
      };
    }),

    edges: edges.map((edge) => ({
      ...edge,
      type: 'smoothstep',
      animated: false,
      style: {
        ...edge.style,
        stroke: '#94a3b8',
        strokeWidth: 1.5,
      },
      pathOptions: {
        borderRadius: 12,
        offset: 30,
      },
    })),
  };
}