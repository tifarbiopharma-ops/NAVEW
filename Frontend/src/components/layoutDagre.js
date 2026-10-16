import dagre from '@dagrejs/dagre';

const NODE_WIDTH = 240;
const NODE_HEIGHT = 110;

export default function getLayoutedElements(nodes, edges, direction = 'TB') {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: 60,
    ranksep: 90,
    marginx: 20,
    marginy: 20,
  });

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return {
    nodes: nodes.map((n) => {
      const { x, y } = g.node(n.id);
      return {
        ...n,
        position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
      };
    }),
    edges,
  };
}