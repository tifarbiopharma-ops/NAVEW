import pool from '../database.js';

const registrarReporteUsuario = async ({
  usuarioId, usuarioNombre, accion, modulo = 'usuarios',
  campoAfectado = '', valorAnterior = undefined, valorNuevo = undefined,
  targetUserId = null, targetUserName = null
}) => {
  try {
    await pool.query(
      `INSERT INTO reportes_usuarios
       (usuario_id, usuario_nombre, modulo, accion, campo_afectado,
        valor_anterior, valor_nuevo, target_user_id, target_user_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        usuarioId ?? null, usuarioNombre ?? null, modulo, accion,
        campoAfectado || null,
        valorAnterior === undefined ? null : JSON.stringify(valorAnterior),
        valorNuevo === undefined ? null : JSON.stringify(valorNuevo),
        targetUserId ?? null, targetUserName ?? null
      ]
    );
  } catch (err) {
    console.error('Error registrando auditoría de usuarios:', err);
  }
};

export { registrarReporteUsuario };
