import crypto from 'node:crypto';
import * as Minio from 'minio';

const endpoint = (process.env.MINIO_ENDPOINT)
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '');
const bucket = process.env.MINIO_BUCKET;
const useSSL = process.env.MINIO_USE_SSL === 'true';

const minioClient = new Minio.Client({
  endPoint: endpoint,
  port: Number(process.env.MINIO_PORT),
  useSSL,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

const extensionPorTipo = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
};

const asegurarBucket = async () => {
  const existe = await minioClient.bucketExists(bucket);
  if (!existe) {
    await minioClient.makeBucket(bucket, process.env.MINIO_REGION);
  }
};

const subirImagen = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'Debes enviar una imagen o pdf en el campo "imagen"' });
    }

    await asegurarBucket();

    const extension = extensionPorTipo[req.file.mimetype];
    const ahora = new Date();
    const fecha = ahora.toISOString().replace(/[:.]/g, '-');
    const mes = ahora.toLocaleString('es-ES', { month: 'long' });
    const objectName = `facturas/${mes}/${fecha}-${crypto.randomUUID()}${extension}`;

    await minioClient.putObject(
      bucket,
      objectName,
      req.file.buffer,
      req.file.size,
      { 'Content-Type': req.file.mimetype },
    );

    const url = await minioClient.presignedGetObject(bucket, objectName, 24 * 60 * 60);

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
    console.error('Error subiendo imagen a MinIO:', error);
    return res.status(500).json({ msg: 'No se pudo subir la imagen o pdf' });
  }
};

export { subirImagen, extensionPorTipo };