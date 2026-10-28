import pool from '../database.js';
import { obtenerJefes } from './organigrama/index.js';
import { ROLES_APROBADORES } from '../middlewares/roles.js';
import { ErrorNegocio } from './errores.js';

// Colaboradores (de la lista dada) cuyo usuario de NAVEW tiene un rol aprobador.
const conRolAprobador = async (ids) => {
  const [rows] = await pool.query(
    `SELECT c.ID_COLABORADOR AS id
     FROM Colaboradores c
     INNER JOIN usuarios u ON u.cedula = c.CEDULA
     WHERE c.ID_COLABORADOR IN (?) AND LOWER(u.rol) IN (?)
     ORDER BY c.ID_COLABORADOR`,
    [ids, ROLES_APROBADORES]
  );
  return rows.map((row) => Number(row.id));
};

// Devuelve todos los colaboradores que pueden aprobar la solicitud (al menos uno).
// El organigrama dice quiénes son los jefes; NAVEW solo exige que tengan un rol aprobador.
// No se interpreta un error de configuración como ausencia de superior.
export const resolverAprobadoresSolicitud = async (idColaborador) => {
  const id = Number(idColaborador);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new ErrorNegocio('Tu usuario no tiene un colaborador asociado', 403);
  }

  const { jefes, raiz } = await obtenerJefes(id);

  if (jefes.length) {
    const aprobadores = await conRolAprobador(jefes);
    if (aprobadores.length) return aprobadores;
    console.warn('Organigrama: los jefes', jefes, 'del colaborador', id, 'no tienen usuario aprobador en NAVEW');
    throw new ErrorNegocio('Tu jefe en el organigrama no tiene un usuario aprobador en NAVEW. Solicita revisión al administrador.', 409);
  }

  // Autoaprobación únicamente si el organigrama marca este cargo como raíz.
  if (raiz && (await conRolAprobador([id])).length) return [id];

  console.warn('Organigrama: sin superior activo para el colaborador', id);
  throw new ErrorNegocio('No se encontró un superior activo o falta configurar el organigrama. Solicita revisión al administrador.', 409);
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
