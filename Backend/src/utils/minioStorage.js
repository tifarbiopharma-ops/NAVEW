import * as Minio from 'minio';

// Tipos de archivo aceptados como evidencia y su extensión en MinIO.
const extensionPorTipo = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
};

const MAX_BYTES = Number(process.env.MINIO_MAX_FILE_BYTES || 10 * 1024 * 1024);
const DIAS_RETENCION_FACTURAS = 30;

// Los enlaces para ver un archivo duran poco: se piden de nuevo cada vez.
const SEGUNDOS_ENLACE_TEMPORAL = 5 * 60;

let minioClient;
let politicaRetencionPromise;

const obtenerConfiguracion = () => {
  const endpoint = (process.env.MINIO_ENDPOINT || '').replace(/^https?:\/\//i, '').replace(/\/$/, '');
  const bucket = process.env.MINIO_BUCKET;
  const port = Number(process.env.MINIO_PORT || (process.env.MINIO_USE_SSL === 'true' ? 443 : 9000));
  if (!endpoint || !bucket || !process.env.MINIO_ACCESS_KEY || !process.env.MINIO_SECRET_KEY || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Configuración MinIO incompleta o inválida');
  }
  return { endpoint, bucket, port };
};

const obtenerCliente = () => {
  const config = obtenerConfiguracion();
  if (!minioClient) {
    minioClient = new Minio.Client({
      endPoint: config.endpoint,
      port: config.port,
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
    });
  }
  return { cliente: minioClient, bucket: config.bucket };
};

/**
 * Valida el archivo recibido por multer. Devuelve un mensaje de error o null.
 */
const validarArchivo = (archivo) => {
  if (!archivo) return 'Debes adjuntar una foto o PDF';
  if (!extensionPorTipo[archivo.mimetype]) return 'Formato no permitido. Usa JPG, PNG, WEBP, GIF o PDF';
  if (!Buffer.isBuffer(archivo.buffer) || !Number.isInteger(archivo.size) || archivo.size < 1 || archivo.size > MAX_BYTES) {
    return 'Archivo vacío, demasiado grande o inválido';
  }
  return null;
};

const configurarRetencionFacturas = async () => {
  if (!politicaRetencionPromise) {
    const { cliente, bucket } = obtenerCliente();
    politicaRetencionPromise = cliente.setBucketLifecycle(bucket, {
      Rule: [{
        ID: 'eliminar-facturas-a-los-30-dias',
        Prefix: 'facturas/',
        Status: 'Enabled',
        Expiration: { Days: DIAS_RETENCION_FACTURAS },
      }],
    }).catch((error) => {
      politicaRetencionPromise = null;
      throw error;
    });
  }
  await politicaRetencionPromise;
};

const subirArchivo = async (objectName, archivo) => {
  await configurarRetencionFacturas();
  const { cliente, bucket } = obtenerCliente();
  await cliente.putObject(bucket, objectName, archivo.buffer, archivo.size, {
    'Content-Type': archivo.mimetype,
  });
  return { bucket, objectName };
};

// Se usa para deshacer una subida cuando la base de datos no se pudo actualizar.
const eliminarArchivo = async (objectName) => {
  const { cliente, bucket } = obtenerCliente();
  await cliente.removeObject(bucket, objectName);
};

const enlaceTemporal = async (objectName) => {
  const { cliente, bucket } = obtenerCliente();
  return cliente.presignedGetObject(bucket, objectName, SEGUNDOS_ENLACE_TEMPORAL);
};

export {
  MAX_BYTES,
  DIAS_RETENCION_FACTURAS,
  SEGUNDOS_ENLACE_TEMPORAL,
  extensionPorTipo,
  validarArchivo,
  configurarRetencionFacturas,
  subirArchivo,
  eliminarArchivo,
  enlaceTemporal,
};
