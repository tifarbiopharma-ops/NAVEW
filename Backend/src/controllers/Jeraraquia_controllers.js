import pool from '../database.js';

const obtenerOrganigrama = async (req, res) => {
  const rol = String(req.user?.rol || '').trim().toLowerCase();
  if (rol !== 'administrador') {
    return res.status(403).json({ msg: 'Acceso restringido a administradores' });
  }

  try {
    const [rows] = await pool.query(`
      SELECT
        j.ID_JERARQUIA,
        j.CARGO,
        j.SUPERIOR_JERARQUICO,
        j.DEPARTAMENTO,
        j.AREA,
        j.PLANTA,
        c.DESCRIPCION AS NOMBRE_CARGO,
        d.DEPARTAMENTO AS NOMBRE_DEPARTAMENTO
      FROM Jerarquia j
      LEFT JOIN Cargos c ON c.ID_CARGOS = j.CARGO
      LEFT JOIN Departamentos d ON d.ID_DEPARTAMENTOS = j.DEPARTAMENTO
      ORDER BY j.ID_JERARQUIA
    `);

    // Conservar el primer nodo encontrado por cargo.
    const cargoANodo = new Map();
    rows.forEach((r) => {
      if (!cargoANodo.has(r.CARGO)) {
        cargoANodo.set(r.CARGO, {
          id: String(r.ID_JERARQUIA),
          data: {
            label: r.NOMBRE_CARGO || `Cargo ${r.CARGO}`,
            cargoId: r.CARGO,
            departamento: r.NOMBRE_DEPARTAMENTO || null,
            area: r.AREA,
            planta: r.PLANTA,
          },
        });
      }
    });

    const nodes = Array.from(cargoANodo.values()).map((n) => ({
      ...n,
      type: 'cargo',
      position: { x: 0, y: 0 },
    }));

    const edgesSet = new Set();
    const edges = [];
    rows.forEach((r) => {
      if (!r.SUPERIOR_JERARQUICO) return;

      const sourceNode = cargoANodo.get(r.SUPERIOR_JERARQUICO);
      const targetNode = cargoANodo.get(r.CARGO);
      if (!sourceNode || !targetNode) return;

      const key = `${sourceNode.id}->${targetNode.id}`;
      if (edgesSet.has(key)) return;
      edgesSet.add(key);

      edges.push({
        id: `e-${sourceNode.id}-${targetNode.id}`,
        source: sourceNode.id,
        target: targetNode.id,
        type: 'smoothstep',
      });
    });

    return res.json({ nodes, edges });
  } catch (err) {
    console.error('Error al obtener el organigrama:', err);
    return res.status(500).json({ error: 'Error al obtener el organigrama' });
  }
};

export { obtenerOrganigrama };
