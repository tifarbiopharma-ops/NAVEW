import multer from 'multer';
import { MAX_BYTES, extensionPorTipo } from '../utils/minioStorage.js';

// El archivo queda en memoria: solo se envía a MinIO después de validar la solicitud.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!extensionPorTipo[file.mimetype]) {
      const error = new Error('Formato no permitido. Usa JPG, PNG, WEBP, GIF o PDF');
      error.code = 'UNSUPPORTED_FILE_TYPE';
      return callback(error);
    }
    callback(null, true);
  },
});

/**
 * Recibe un único archivo en el campo indicado y lo deja en req.file.
 */
const recibirArchivo = (campo) => (req, res, next) => {
  upload.single(campo)(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ msg: `El archivo no puede superar los ${Math.round(MAX_BYTES / 1024 / 1024)} MB` });
    }
    return res.status(400).json({ msg: error.message });
  });
};

export { recibirArchivo };
