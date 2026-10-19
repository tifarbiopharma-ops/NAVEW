import pool from '../database.js';

// Auditoría independiente de la minería de procesos.
// Retorna false ante fallos para no revertir operaciones ya confirmadas.
export const registrarReporteTraslado = async ({ usuarioId, usuarioNombre = null, accion, idTraslado, estadoAnterior = null, estadoNuevo = null, detalles = null }) => {
  if (!usuarioId || !accion || !idTraslado) return false;
  try {
    await pool.query(
      `INSERT INTO reportes_traslados
       (usuario_id, usuario_nombre, accion, id_traslado, estado_anterior, estado_nuevo, detalles)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [usuarioId, usuarioNombre, accion, idTraslado, estadoAnterior, estadoNuevo,
       detalles == null ? null : JSON.stringify(detalles)]
    );
    return true;
  } catch (error) {
    console.error('No se pudo registrar auditoría de traslado:', error.code || 'ERROR');
    return false;
  }
};
