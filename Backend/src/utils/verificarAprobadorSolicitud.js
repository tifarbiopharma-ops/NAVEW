import pool from '../database.js';
import { obtenerJefesDirectos } from './jerarquia.js';
import { ROLES_APROBADORES } from '../middlewares/roles.js';

// Devuelve todos los colaboradores que pueden aprobar la solicitud (al menos uno).
// No se interpreta un error de configuración como ausencia de superior.
export const resolverAprobadoresSolicitud = async (idColaborador) => {
  const id = Number(idColaborador);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error('Colaborador no válido');
  }

  const jefes = await obtenerJefesDirectos(id);
  if (jefes.length) return jefes;

  const [rows] = await pool.query(`
    SELECT jer.SUPERIOR_JERARQUICO AS superior,
           LOWER(u.rol) AS rol
    FROM Colaboradores c
    INNER JOIN Cargos cargo ON cargo.ID_CARGOS = c.CARGO
    INNER JOIN Jerarquia jer
      ON jer.CARGO = c.CARGO
     AND jer.DEPARTAMENTO = cargo.DEPARTAMENTO
     AND jer.AREA = cargo.AREA
    INNER JOIN usuarios u ON u.cedula = c.CEDULA
    WHERE c.ID_COLABORADOR = ?
  `, [id]);

  // Autoaprobación únicamente si el organigrama marca expresamente
  // este cargo como raíz (SUPERIOR_JERARQUICO = NULL).
  const esRaiz = rows.length > 0 && rows.every(row => row.superior == null);
  const rolHabilitado = rows.some(row => ROLES_APROBADORES.includes(row.rol));
  if (esRaiz && rolHabilitado) return [id];

  throw new Error('No se encontró un superior activo o falta configurar el organigrama. Solicita revisión al administrador.');
};

// Cuando un jefe responde, las aprobaciones pendientes de los demás ya no aplican.
// Se borran (el CHECK de ESTADO no admite otro valor) y se devuelven sus IDs para la auditoría.
export const descartarOtrasAprobaciones = async (connection, tipoSolicitud, idSolicitud, idAprobacionResuelta) => {
  const condicion = `TIPO_SOLICITUD = ? AND ID_SOLICITUD = ? AND ESTADO = 'PENDIENTE' AND ID_APROBACION <> ?`;
  const params = [tipoSolicitud, idSolicitud, idAprobacionResuelta];

  const [pendientes] = await connection.query(
    `SELECT ID_APROBADOR FROM Aprobaciones WHERE ${condicion}`, params
  );
  if (!pendientes.length) return [];

  await connection.query(`DELETE FROM Aprobaciones WHERE ${condicion}`, params);
  return pendientes.map((row) => Number(row.ID_APROBADOR));
};
