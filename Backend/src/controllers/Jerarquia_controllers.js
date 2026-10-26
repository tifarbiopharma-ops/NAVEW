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
    const [colaboradores] = await pool.query(`
      SELECT CARGO, NOMBRE
      FROM Colaboradores
      WHERE CARGO IS NOT NULL
        AND NOMBRE IS NOT NULL
      ORDER BY NOMBRE
    `);

    const nombresPorCargo = new Map();

    colaboradores.forEach((colaborador) => {
      const cargo = String(colaborador.CARGO);
      const nombre = String(colaborador.NOMBRE).trim();

      if (!nombre) return;

      if (!nombresPorCargo.has(cargo)) {
        nombresPorCargo.set(cargo, new Set());
      }

      nombresPorCargo.get(cargo).add(nombre);
    });

    const [configuracion] = await pool.query(`
      SELECT COLORES
      FROM OrganigramaConfiguracion
      WHERE ID = 1
    `);

    const coloresGuardados = configuracion[0]?.COLORES;

    const coloresPersonalizados =
      typeof coloresGuardados === 'string'
        ? JSON.parse(coloresGuardados)
        : coloresGuardados || {};

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

            colaboradores: Array.from(
              nombresPorCargo.get(String(r.CARGO)) || []
            ),

            colaborador: Array.from(
              nombresPorCargo.get(String(r.CARGO)) || []
            ).join(', '),
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

    return res.json({ nodes, edges, coloresPersonalizados });
  } catch (err) {
    console.error('Error al obtener el organigrama:', err);
    return res.status(500).json({ error: 'Error al obtener el organigrama' });
  }
};


const guardarColoresOrganigrama = async (req, res) => {
  const rol = String(req.user?.rol || '').trim().toLowerCase();

  if (rol !== 'administrador') {
    return res.status(403).json({
      msg: 'Acceso restringido a administradores',
    });
  }

  const colores = req.body?.coloresPersonalizados;

  if (
    !colores ||
    typeof colores !== 'object' ||
    Array.isArray(colores)
  ) {
    return res.status(400).json({
      msg: 'Formato de colores incorrecto',
    });
  }

  const entradas = Object.entries(colores);
  const hexValido = /^#[0-9a-f]{6}$/i;

  if (
    entradas.length > 10000 ||
    entradas.some(([id, paleta]) =>
      !/^\d+$/.test(id) ||
      !paleta ||
      !hexValido.test(paleta.bg) ||
      !hexValido.test(paleta.border) ||
      !hexValido.test(paleta.texto)
    )
  ) {
    return res.status(400).json({
      msg: 'Hay colores o identificadores incorrectos',
    });
  }

  try {
    const [jerarquias] = await pool.query(`
      SELECT ID_JERARQUIA FROM Jerarquia
    `);

    const idsValidos = new Set(
      jerarquias.map((item) => String(item.ID_JERARQUIA))
    );

    if (entradas.some(([id]) => !idsValidos.has(id))) {
      return res.status(400).json({
        msg: 'Uno de los cargos ya no existe. Recarga el organigrama.',
      });
    }

    const coloresLimpios = Object.fromEntries(
      entradas.map(([id, paleta]) => [
        id,
        {
          bg: paleta.bg,
          border: paleta.border,
          texto: paleta.texto,
        },
      ])
    );

    const contenido = JSON.stringify(coloresLimpios);

    await pool.query(
      `INSERT INTO OrganigramaConfiguracion (ID, COLORES)
       VALUES (1, ?)
       ON DUPLICATE KEY UPDATE COLORES = ?`,
      [contenido, contenido]
    );

    return res.json({ msg: 'Colores guardados correctamente' });
  } catch (error) {
    console.error('Error guardando colores:', error);

    return res.status(500).json({
      msg: 'No se pudieron guardar los colores',
    });
  }
};

export { obtenerOrganigrama, guardarColoresOrganigrama };
