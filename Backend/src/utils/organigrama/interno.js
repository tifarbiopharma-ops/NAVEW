import pool from '../../database.js';

// LÓGICA TEMPORAL. La fuente oficial del organigrama es el panel del directorio
// (BACK_FRONT_FARBIOPHARMA). Esto replica su resolver_aprobador_efectivo para poder
// probar NAVEW mientras no tengamos acceso a su API; se reemplaza con
// ORGANIGRAMA_FUENTE=panel (ver panelDirectorio.js).
//
// Diferencias conocidas con el panel, pendientes de revisar con Ariel:
// - No exige que la planta coincida (EL JAPONES no tiene filas); solo la usa
//   como desempate cuando un cargo tiene un jefe distinto por planta.
// - No exige que el cargo del jefe sea del mismo departamento y área que el
//   empleado (con ese filtro ningún jefe de otra área aprobaría).

const MAX_NIVELES = 20;

/**
 * Busca los jefes de un colaborador subiendo por Jerarquia dentro del contexto
 * de su cargo (departamento y área). Si el cargo superior no tiene ocupantes
 * activos (vacante o ausentes), sube al siguiente nivel.
 *
 * @param {number} idColaborador
 * @returns {Promise<{ jefes: number[], raiz: boolean, saltados: number[] }>}
 *   jefes: ocupantes activos del primer cargo superior con gente;
 *   raiz: el cargo del colaborador no tiene superior en el organigrama;
 *   saltados: cargos superiores sin ocupantes activos que se saltaron.
 */
const obtenerJefes = async (idColaborador) => {
  const [[colaborador]] = await pool.query(
    `SELECT c.CARGO AS cargo, cg.DEPARTAMENTO AS departamento,
            cg.AREA AS area, ub.DESCRIPCION AS planta
     FROM Colaboradores c
     INNER JOIN Cargos cg ON cg.ID_CARGOS = c.CARGO
     LEFT JOIN Ubicaciones ub ON ub.ID_UBICACIONES = c.UBICACION
     WHERE c.ID_COLABORADOR = ?`,
    [idColaborador]
  );

  const resultado = { jefes: [], raiz: false, saltados: [] };
  if (!colaborador) return resultado;

  const { departamento, area, planta } = colaborador;
  let cargos = [colaborador.cargo];
  const visitados = new Set(cargos);

  for (let nivel = 0; nivel < MAX_NIVELES && cargos.length; nivel++) {
    const [filas] = await pool.query(
      `SELECT SUPERIOR_JERARQUICO AS superior, PLANTA AS planta
       FROM Jerarquia
       WHERE CARGO IN (?) AND DEPARTAMENTO = ? AND AREA = ?`,
      [cargos, departamento, area]
    );
    if (!filas.length) return resultado;

    const dePlanta = filas.filter((fila) => fila.planta === planta);
    const superiores = [...new Set((dePlanta.length ? dePlanta : filas)
      .map((fila) => fila.superior)
      .filter((superior) => superior != null && !visitados.has(superior)))];

    if (!superiores.length) {
      resultado.raiz = nivel === 0 && filas.every((fila) => fila.superior == null);
      return resultado;
    }
    superiores.forEach((superior) => visitados.add(superior));

    const [ocupantes] = await pool.query(
      `SELECT ID_COLABORADOR AS id
       FROM Colaboradores
       WHERE CARGO IN (?) AND ESTADO = 'ACTIVO' AND ID_COLABORADOR <> ?
       ORDER BY ID_COLABORADOR`,
      [superiores, idColaborador]
    );
    if (ocupantes.length) {
      resultado.jefes = ocupantes.map((ocupante) => Number(ocupante.id));
      return resultado;
    }

    resultado.saltados.push(...superiores);
    cargos = superiores;
  }

  return resultado;
};

/**
 * Obtiene los colaboradores activos que están debajo de un jefe, recorriendo
 * Jerarquia dentro de un mismo departamento y área: un colaborador cuenta solo
 * si su cargo coincide con el departamento y el área de su fila.
 *
 * @param {number} idJefe
 * @returns {Promise<number[]>}
 */
const obtenerColaboradoresACargo = async (idJefe) => {
  const [rows] = await pool.query(
    `WITH RECURSIVE cargos_subordinados AS (
       SELECT j.CARGO AS id_cargo, j.DEPARTAMENTO AS departamento, j.AREA AS area, 1 AS nivel
       FROM Jerarquia j
       INNER JOIN Colaboradores jefe ON jefe.CARGO = j.SUPERIOR_JERARQUICO
       WHERE jefe.ID_COLABORADOR = ?

       UNION ALL

       SELECT j.CARGO, j.DEPARTAMENTO, j.AREA, cs.nivel + 1
       FROM Jerarquia j
       INNER JOIN cargos_subordinados cs
         ON j.SUPERIOR_JERARQUICO = cs.id_cargo
        AND j.DEPARTAMENTO = cs.departamento
        AND j.AREA = cs.area
       WHERE cs.nivel < ${MAX_NIVELES}
     )
     SELECT DISTINCT colaborador.ID_COLABORADOR
     FROM Colaboradores colaborador
     INNER JOIN Cargos cargo ON cargo.ID_CARGOS = colaborador.CARGO
     INNER JOIN cargos_subordinados cs
       ON cs.id_cargo = colaborador.CARGO
      AND cs.departamento = cargo.DEPARTAMENTO
      AND cs.area = cargo.AREA
     WHERE colaborador.ID_COLABORADOR <> ?
       AND colaborador.ESTADO = 'ACTIVO'`,
    [idJefe, idJefe]
  );

  return rows.map((row) => Number(row.ID_COLABORADOR));
};

export { obtenerJefes, obtenerColaboradoresACargo };
