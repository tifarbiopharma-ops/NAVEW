import express from 'express';
import {
  createEnvio,
  getEnvios,
  approveEnvio,
  validateQrEnvio,
} from '../controllers/Envios_controllers.js';
import { verificarTokenJWT } from '../middlewares/JWT.js';

const router = express.Router();

router.post('/create', verificarTokenJWT, createEnvio);
router.get('/all', verificarTokenJWT, getEnvios);
router.put('/approve/:id', verificarTokenJWT, approveEnvio);
router.post('/validate', verificarTokenJWT, validateQrEnvio);

export default router;
