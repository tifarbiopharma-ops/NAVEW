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
      JOIN Cargos cargo_emp ON emp.CARGO = cargo_emp.ID_CARGOS
      JOIN Colaboradores jefe ON jefe.CARGO = cargo_emp.ID_CARGO_SUPERIOR
      JOIN usuarios usuario_jefe ON usuario_jefe.cedula = jefe.CEDULA
      WHERE emp.ID_COLABORADOR = ? 
        AND jefe.ESTADO = 'ACTIVO'
        AND usuario_jefe.rol IN ('jefe', 'administrador')
      LIMIT 1;
    `;
    
    const [rows] = await pool.query(query, [idColaborador]);
    
    if (rows.length > 0) {
      return rows[0].ID_COLABORADOR;
    }
    
    // Fallback: Si no hay cargo superior explícito en la tabla Cargos, 
    // buscar al jefe del mismo Área/Departamento.
    const fallbackQuery = `
      SELECT jefe.ID_COLABORADOR
      FROM Colaboradores emp
      JOIN Colaboradores jefe ON 
        (jefe.AREA = emp.AREA OR jefe.DEPARTAMENTO = emp.DEPARTAMENTO)
      JOIN usuarios usuario_jefe ON usuario_jefe.cedula = jefe.CEDULA
      WHERE emp.ID_COLABORADOR = ? 
        AND jefe.ID_COLABORADOR != emp.ID_COLABORADOR
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
