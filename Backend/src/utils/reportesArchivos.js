import pool from '../database.js';

export const registrarReporteArchivo = async ({
  usuarioId,
  usuarioNombre = null,
  accion,
  bucket,
  objectName,
  nombreOriginal = null,
  tipoMime = null,
  tamanio = null,
}) => {
  if (!usuarioId || !accion || !bucket || !objectName) return false;
  try {
    await pool.query(
      `INSERT INTO reportes_archivos
       (usuario_id, usuario_nombre, accion, bucket, object_name, nombre_original, tipo_mime, tamanio)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [usuarioId, usuarioNombre, accion, bucket, objectName, nombreOriginal, tipoMime, tamanio]
    );
    return true;
  } catch (error) {
    console.error('No se pudo registrar auditoría de archivos:', error?.code || 'ERROR');
    return false;
  }
};
