import express from 'express';
import multer from 'multer';
import { verificarTokenJWT } from '../middlewares/JWT.js';
import { extensionPorTipo, subirImagen } from '../controllers/Imagenes_controllers.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!extensionPorTipo[file.mimetype]) {
      const error = new Error('Formato no permitido. Usa JPG, PNG, WEBP, GIF o PDF');
      error.code = 'UNSUPPORTED_IMAGE_TYPE';
      return callback(error);
    }
    callback(null, true);
  },
});

const recibirImagen = (req, res, next) => {
  upload.fields([
    { name: 'imagen', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ])(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ msg: 'La imagen no puede superar los 10 MB' });
      }

      return res.status(400).json({ msg: error.message });
    }

    req.file = req.files?.imagen?.[0] || req.files?.file?.[0];
    next();
  });
};

router.post('/', verificarTokenJWT, recibirImagen, subirImagen);

export default router;