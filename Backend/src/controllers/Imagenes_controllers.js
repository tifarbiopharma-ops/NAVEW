import crypto from 'node:crypto';
import * as Minio from 'minio';
import { registrarReporteArchivo } from '../utils/reportesArchivos.js';

const extensionPorTipo = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
};

const MAX_BYTES = Number(process.env.MINIO_MAX_FILE_BYTES || 10 * 1024 * 1024);
let minioClient;

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

const asegurarBucket = async (cliente, bucket) => {
  const existe = await cliente.bucketExists(bucket);
  if (!existe) await cliente.makeBucket(bucket, process.env.MINIO_REGION);
};

const subirImagen = async (req, res) => {
  if (!req.user?.id) return res.status(401).json({ msg: 'Debes iniciar sesión' });
  if (!req.file) return res.status(400).json({ msg: 'Debes enviar una imagen o pdf en el campo "imagen"' });

  const extension = extensionPorTipo[req.file.mimetype];
  if (!extension) return res.status(400).json({ msg: 'Tipo de archivo no permitido' });
  if (!Buffer.isBuffer(req.file.buffer) || !Number.isInteger(req.file.size) || req.file.size < 1 || req.file.size > MAX_BYTES) {
    return res.status(400).json({ msg: 'Archivo vacío, demasiado grande o inválido' });
  }

  try {
    const { cliente, bucket } = obtenerCliente();
    await asegurarBucket(cliente, bucket);
    const ahora = new Date();
    const fecha = ahora.toISOString().replace(/[:.]/g, '-');
    const mes = ahora.toLocaleString('es-ES', { month: 'long', timeZone: 'UTC' });
    const objectName = `facturas/${mes}/${fecha}-${crypto.randomUUID()}${extension}`;

    await cliente.putObject(bucket, objectName, req.file.buffer, req.file.size, {
      'Content-Type': req.file.mimetype,
    });
    const url = await cliente.presignedGetObject(bucket, objectName, 24 * 60 * 60);

    // La auditoría es independiente: su fallo no revierte un archivo ya subido.
    const auditado = await registrarReporteArchivo({
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre || null,
      accion: 'SUBIR_ARCHIVO',
      bucket,
      objectName,
      nombreOriginal: req.file.originalname,
      tipoMime: req.file.mimetype,
      tamanio: req.file.size,
    });
    if (!auditado) console.warn('Archivo subido, pero no se pudo registrar su auditoría');

    return res.status(201).json({
      msg: 'Imagen o pdf subido correctamente',
      imagen: {
        bucket,
        objectName,
        nombre: req.file.originalname,
        tipo: req.file.mimetype,
        tamanio: req.file.size,
        url,
      },
    });
  } catch (error) {
    console.error('Error subiendo imagen a MinIO:', error?.code || error?.message || 'ERROR');
    return res.status(500).json({ msg: 'No se pudo subir la imagen o pdf' });
  }
};

export { subirImagen, extensionPorTipo };
