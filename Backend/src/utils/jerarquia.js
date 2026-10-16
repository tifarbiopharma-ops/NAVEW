import pool from '../database.js';

/**
 * Obtiene el ID del Jefe Directo de un colaborador basándose en la jerarquía de cargos.
 * @param {number} idColaborador - ID del empleado solicitante.
 * @returns {Promise<number|null>} - Retorna el ID_COLABORADOR del jefe o null si no se encuentra.
 */
export const obtenerJefeDirecto = async (idColaborador) => {
  try {
    const query = `
      SELECT jefe.ID_COLABORADOR
      FROM Colaboradores emp
      JOIN Jerarquia jer 
        ON jer.CARGO = emp.CARGO
      JOIN Colaboradores jefe 
        ON jefe.CARGO = jer.SUPERIOR_JERARQUICO
      JOIN usuarios usuario_jefe 
        ON usuario_jefe.cedula = jefe.CEDULA
      WHERE emp.ID_COLABORADOR = ?
        AND jefe.ID_COLABORADOR <> emp.ID_COLABORADOR
        AND jefe.ESTADO = 'ACTIVO'
        AND usuario_jefe.rol IN ('jefe', 'administrador')
      LIMIT 1;
    `;

    const [rows] = await pool.query(query, [idColaborador]);
    if (rows.length > 0) return rows[0].ID_COLABORADOR;

    // Fallback: jefe por mismo Departamento (vive en Cargos, no en Colaboradores)
    const fallbackQuery = `
      SELECT jefe.ID_COLABORADOR
      FROM Colaboradores emp
      JOIN Cargos cargo_emp ON cargo_emp.ID_CARGOS = emp.CARGO
      JOIN Cargos cargo_jefe ON cargo_jefe.DEPARTAMENTO = cargo_emp.DEPARTAMENTO
      JOIN Colaboradores jefe ON jefe.CARGO = cargo_jefe.ID_CARGOS
      JOIN usuarios usuario_jefe ON usuario_jefe.cedula = jefe.CEDULA
      WHERE emp.ID_COLABORADOR = ?
        AND jefe.ID_COLABORADOR <> emp.ID_COLABORADOR
        AND jefe.ESTADO = 'ACTIVO'
        AND usuario_jefe.rol = 'jefe'
      LIMIT 1;
    `;

    const [fallbackRows] = await pool.query(fallbackQuery, [idColaborador]);
    return fallbackRows.length > 0 ? fallbackRows[0].ID_COLABORADOR : null;

  } catch (error) {
    console.error('Error al obtener el jefe directo:', error);
    throw new Error('No se pudo determinar el jefe directo en la base de datos');
  }
};

export const obtenerColaboradoresACargo = async (idJefe) => {
  const [rows] = await pool.query(
    `WITH RECURSIVE cargos_subordinados AS (
      -- Nivel 1: cargos cuyo superior directo es el cargo del jefe
      SELECT j.CARGO AS id_cargo
      FROM Jerarquia j
      JOIN Colaboradores jefe ON jefe.ID_COLABORADOR = ?
      WHERE j.SUPERIOR_JERARQUICO = jefe.CARGO

      UNION ALL

      -- Niveles siguientes
      SELECT j.CARGO
      FROM Jerarquia j
      INNER JOIN cargos_subordinados padre 
        ON j.SUPERIOR_JERARQUICO = padre.id_cargo
    )
    SELECT DISTINCT colaborador.ID_COLABORADOR
    FROM Colaboradores colaborador
    INNER JOIN cargos_subordinados c 
      ON c.id_cargo = colaborador.CARGO
    WHERE colaborador.ID_COLABORADOR <> ?
      AND colaborador.ESTADO = 'ACTIVO'`,
    [idJefe, idJefe]
  );

  return rows.map(({ ID_COLABORADOR }) => ID_COLABORADOR);
};
