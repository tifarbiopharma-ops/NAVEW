import pool from '../database.js';

const registrarReporteAcceso = async ({
  usuarioId,
  usuarioNombre = null,
  accion,
  idAcceso = null,
  estadoAnterior = null,
  estadoNuevo = null,
  detalles = null,
}) => {
  try {
    if (!Number.isSafeInteger(Number(usuarioId)) || Number(usuarioId) <= 0) {
      throw new Error('usuarioId debe ser un ID valido de usuarios');
    }
    if (typeof accion !== 'string' || !accion.trim()) {
      throw new Error('accion es obligatoria');
    }

    await pool.query(
      `INSERT INTO reportes_accesos
       (usuario_id, usuario_nombre, id_acceso, accion,
        estado_anterior, estado_nuevo, detalles)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(usuarioId),
        usuarioNombre || null,
        idAcceso || null,
        accion.trim(),
        estadoAnterior,
        estadoNuevo,
        detalles == null ? null : JSON.stringify(detalles),
      ]
    );
    return true;
  } catch (error) {
    console.error('Error registrando auditoria de accesos:', error);
    return false;
  }
};

export { registrarReporteAcceso };
