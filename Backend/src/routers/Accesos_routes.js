import express from 'express';
import {
  createAcceso,
  getAccesos,
  approveAcceso,
  validateQrAcceso,
} from '../controllers/Accesos_controllers.js';
import { verificarTokenJWT } from '../middlewares/JWT.js';

const router = express.Router();

router.post('/create', verificarTokenJWT, createAcceso);
router.get('/all', verificarTokenJWT, getAccesos);
router.put('/approve/:id', verificarTokenJWT, approveAcceso);
router.post('/validate', verificarTokenJWT, validateQrAcceso);

export default router;
