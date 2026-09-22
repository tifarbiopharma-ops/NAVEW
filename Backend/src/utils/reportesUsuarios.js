import pool from '../database.js';

const registrarReporteUsuario = async ({
  usuarioId,
  usuarioNombre,
  accion,
  modulo = 'usuarios',
  campoAfectado = '',
  valorAnterior = undefined,
  valorNuevo = undefined,
  targetUserId = null,
  targetUserName = null,
}) => {
  try {
    let usuarioValido = null;

    if (usuarioId) {
      const [usuarios] = await pool.query('SELECT id FROM usuarios WHERE id = ?', [usuarioId]);
      usuarioValido = usuarios.length > 0 ? Number(usuarioId) : null;
    }

    await pool.query(
      `
        INSERT INTO reportes_usuarios
        (usuario_id, usuario_nombre, modulo, accion, campo_afectado, valor_anterior, valor_nuevo, target_user_id, target_user_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        usuarioValido,
        usuarioNombre || null,
        modulo,
        accion,
        campoAfectado || null,
        valorAnterior === undefined ? null : JSON.stringify(valorAnterior),
        valorNuevo === undefined ? null : JSON.stringify(valorNuevo),
        targetUserId || null,
        targetUserName || null,
      ]
    );
  } catch (error) {
    console.error('Error registrando auditoría de usuarios:', error.message);
  }
};

export { registrarReporteUsuario };
