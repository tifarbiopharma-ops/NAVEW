import pool from '../database.js';

/**
 * Registra una accion de auditoria de paqueteria.
 * usuarioId corresponde a usuarios.id (req.user.id).
 * idPaquete corresponde a Envios_Paqueteria.ID_Paquete (UUID).
 * Devuelve true si se registro; false si fallo.
 * Nunca incluir contrasenas, tokens JWT ni tokens QR en detalles.
 */
const registrarReporteEnvio = async ({
  usuarioId,
  usuarioNombre = null,
  accion,
  idPaquete,
  estadoAnterior = null,
  estadoNuevo = null,
  detalles = null,
}) => {
  try {
    if (!Number.isSafeInteger(Number(usuarioId)) || Number(usuarioId) <= 0) {
      throw new Error('usuarioId invalido');
    }
    if (typeof accion !== 'string' || !accion.trim()) {
      throw new Error('accion obligatoria');
    }
    if (typeof idPaquete !== 'string' || !idPaquete.trim()) {
      throw new Error('idPaquete obligatorio');
    }

    await pool.query(
      `INSERT INTO reportes_envios
        (usuario_id, usuario_nombre, id_paquete, accion,
         estado_anterior, estado_nuevo, detalles)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(usuarioId),
        usuarioNombre || null,
        idPaquete,
        accion.trim(),
        estadoAnterior,
        estadoNuevo,
        detalles == null ? null : JSON.stringify(detalles),
      ]
    );
    return true;
  } catch (error) {
    console.error('Error registrando auditoria de envios:', error);
    return false;
  }
};

export { registrarReporteEnvio };
