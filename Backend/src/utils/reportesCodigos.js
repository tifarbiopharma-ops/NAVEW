import pool from '../database.js';

const registrarReporteCodigo = async ({
  codigoId,
  codigo,
  modulo,
  accion,
  campoAfectado,
  valorAnterior,
  valorNuevo,
  usuarioId,
  usuarioNombre
}) => {
  const insertQuery = `
    INSERT INTO reportes_codigos
    (codigo_id, codigo, modulo, accion, campo_afectado, valor_anterior, valor_nuevo, usuario_id, usuario_nombre)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  await pool.query(insertQuery, [
    codigoId,
    codigo || null,
    modulo,
    accion,
    campoAfectado || null,
    valorAnterior === undefined ? null : JSON.stringify(valorAnterior),
    valorNuevo === undefined ? null : JSON.stringify(valorNuevo),
    usuarioId || null,
    usuarioNombre || null
  ]);
};

export { registrarReporteCodigo };