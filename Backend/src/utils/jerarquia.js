
import pool from '../database.js';
import { ROLES_APROBADORES } from '../middlewares/roles.js';

/**
 * Obtiene los jefes directos de un colaborador
 * según su cargo, departamento y área.
 *
 * La fila de Jerarquia del colaborador debe coincidir con el departamento
 * y el área de su cargo: es la misma regla que usa obtenerColaboradoresACargo,
 * así quien aprueba una solicitud siempre la ve en su histórico.
 * Como en el CRUD de jerarquía, si varias personas ocupan el cargo superior,
 * todas son aprobadoras.
 *
 * @param {number} idColaborador
 * @returns {Promise<number[]>}
 */
const obtenerJefesDirectos = async (idColaborador) => {
  try {
    const id = Number(idColaborador);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return [];
    }

    const query = `
      SELECT DISTINCT
        jefe.ID_COLABORADOR AS idJefe

      FROM Colaboradores emp

      INNER JOIN Cargos cargo_emp
        ON cargo_emp.ID_CARGOS = emp.CARGO

      INNER JOIN Jerarquia jer
        ON jer.CARGO = emp.CARGO
        AND jer.DEPARTAMENTO = cargo_emp.DEPARTAMENTO
        AND jer.AREA = cargo_emp.AREA

      INNER JOIN Colaboradores jefe
        ON jefe.CARGO = jer.SUPERIOR_JERARQUICO
        AND jefe.ESTADO = 'ACTIVO'

      INNER JOIN usuarios usuario_jefe
        ON usuario_jefe.cedula = jefe.CEDULA
        AND LOWER(usuario_jefe.rol) IN (?)

      WHERE emp.ID_COLABORADOR = ?
        AND jefe.ID_COLABORADOR <> emp.ID_COLABORADOR

      ORDER BY jefe.ID_COLABORADOR ASC
    `;

    const [rows] = await pool.query(query, [ROLES_APROBADORES, id]);

    if (rows.length === 0) {
      console.warn(
        'No se encontró un aprobador para el colaborador:',
        id
      );
      return [];
    }

    const jefes = rows.map((row) => Number(row.idJefe));

    console.log('Solicitante:', id);
    console.log('Aprobadores encontrados:', jefes);

    return jefes;

  } catch (error) {
    console.error('Error al obtener los jefes directos:', error);
    throw error;
  }
};



/**
 * Obtiene los colaboradores subordinados a un jefe
 * recorriendo recursivamente la jerarquía.
 *
 * Igual que el CRUD de jerarquía (repo BACK_FRONT_FARBIOPHARMA), cada cadena
 * vive dentro de un mismo departamento y área: un colaborador cuenta solo si
 * su cargo coincide con el departamento y el área de su fila en Jerarquia.
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
  obtenerJefesDirectos,
  obtenerColaboradoresACargo,
};
