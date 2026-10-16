// backend/routes/jerarquia.js
import express from 'express';
import pool from '../database.js';
import { verificarTokenJWT } from '../middlewares/JWT.js';

const router = express.Router();

router.get('/organigrama', verificarTokenJWT, async (req, res) => {
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

    // 🔑 1. Agrupar por CARGO → un solo nodo por cargo único
    //    Nos quedamos con el primer ID_JERARQUIA que aparezca para ese CARGO
    const cargoANodo = new Map();   // CARGO → { id, ...data }
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

    // 🔑 2. Aristas: para cada fila, conectar el nodo del SUPERIOR con el nodo del CARGO
    //    Como los cargos duplicados ya están fusionados, esta arista puede repetirse
    //    visualmente si dos filas apuntan al mismo par (superior, cargo) → deduplicamos
    const edgesSet = new Set();
    const edges = [];

    rows.forEach((r) => {
      if (!r.SUPERIOR_JERARQUICO) return;

      const sourceNode = cargoANodo.get(r.SUPERIOR_JERARQUICO);
      const targetNode = cargoANodo.get(r.CARGO);
      if (!sourceNode || !targetNode) return;

      // Evita duplicar la misma arista si dos filas generan el mismo par
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

    res.json({ nodes, edges });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener el organigrama' });
  }
});

export default router;