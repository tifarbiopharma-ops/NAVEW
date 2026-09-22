import express from 'express';
import {
  createSalida,
  getSalidas,
  approveSalida,
  validateQrSalida,
} from '../controllers/Salidas_controllers.js';
import { verificarTokenJWT } from '../middlewares/JWT.js';

const router = express.Router();

router.post('/create', verificarTokenJWT, createSalida);
router.get('/all', verificarTokenJWT, getSalidas);
router.put('/approve/:id', verificarTokenJWT, approveSalida);
router.post('/validate', verificarTokenJWT, validateQrSalida);

export default router;
