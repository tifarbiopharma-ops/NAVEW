
import pool from '../database.js';

/**
 * Obtiene el jefe directo de un colaborador
 * según su cargo, departamento y área.
 *
 * @param {number} idColaborador
 * @returns {Promise<number|null>}
 */


const obtenerJefeDirecto = async (idColaborador) => {
  try {
    const id = Number(idColaborador);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return null;
    }

    const query = `
      SELECT
        jefe.ID_COLABORADOR AS idJefe

      FROM Colaboradores emp

      INNER JOIN Cargos cargo_emp
        ON cargo_emp.ID_CARGOS = emp.CARGO

      INNER JOIN Jerarquia jer
        ON jer.CARGO = emp.CARGO
        AND jer.DEPARTAMENTO = cargo_emp.DEPARTAMENTO

      INNER JOIN Colaboradores jefe
        ON jefe.CARGO = jer.SUPERIOR_JERARQUICO
        AND jefe.ESTADO = 'ACTIVO'

      INNER JOIN usuarios usuario_jefe
        ON usuario_jefe.cedula = jefe.CEDULA
        AND LOWER(usuario_jefe.rol) IN (
          'jefe',
          'administrador',
          'subgerentegeneral'
        )

      WHERE emp.ID_COLABORADOR = ?
        AND jefe.ID_COLABORADOR <> emp.ID_COLABORADOR

      ORDER BY
        CASE
          WHEN jer.AREA = cargo_emp.AREA THEN 0
          ELSE 1
        END,
        jefe.ID_COLABORADOR ASC

      LIMIT 1
    `;

    const [rows] = await pool.query(query, [id]);

    if (rows.length === 0) {
      console.warn(
        'No se encontró un aprobador para el colaborador:',
        id
      );
      return null;
    }

    console.log('Solicitante:', id);
    console.log('Aprobador encontrado:', rows[0].idJefe);

    return rows[0].idJefe;

  } catch (error) {
    console.error('Error al obtener el jefe directo:', error);
    throw error;
  }
};



/**
 * Obtiene los colaboradores subordinados a un jefe
 * recorriendo recursivamente la jerarquía.
 *
 * @param {number} idJefe
 * @returns {Promise<number[]>}
 */
const obtenerColaboradoresACargo = async (idJefe) => {
  try {
    const id = Number(idJefe);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return [];
    }

    const query = `
      WITH RECURSIVE cargos_subordinados AS (
        SELECT
          j.CARGO AS id_cargo,
          j.DEPARTAMENTO AS departamento,
          j.AREA AS area,
          1 AS nivel
        FROM Jerarquia j
        INNER JOIN Colaboradores jefe
          ON jefe.CARGO = j.SUPERIOR_JERARQUICO
        WHERE jefe.ID_COLABORADOR = ?

        UNION ALL

        SELECT
          j.CARGO AS id_cargo,
          j.DEPARTAMENTO AS departamento,
          j.AREA AS area,
          cs.nivel + 1 AS nivel
        FROM Jerarquia j
        INNER JOIN cargos_subordinados cs
          ON j.SUPERIOR_JERARQUICO = cs.id_cargo
          AND j.DEPARTAMENTO = cs.departamento
          AND j.AREA = cs.area
        WHERE cs.nivel < 20
      )

      SELECT DISTINCT
        colaborador.ID_COLABORADOR
      FROM Colaboradores colaborador

      INNER JOIN Cargos cargo
        ON cargo.ID_CARGOS = colaborador.CARGO

      INNER JOIN cargos_subordinados cs
        ON cs.id_cargo = colaborador.CARGO
        AND cs.departamento = cargo.DEPARTAMENTO
        AND cs.area = cargo.AREA

      WHERE colaborador.ID_COLABORADOR <> ?
        AND colaborador.ESTADO = 'ACTIVO'
    `;

    const [rows] = await pool.query(query, [id, id]);

    return rows.map((row) => row.ID_COLABORADOR);

  } catch (error) {
    console.error(
      'Error al obtener colaboradores a cargo:',
      error
    );
    throw error;
  }
};

export {
  obtenerJefeDirecto,
  obtenerColaboradoresACargo,
};
