import express from 'express';
import {
  createTrasladoEmpresarial,
  createTrasladoPersonal,
  createTrasladoPrivado,
  getTraslados,
  getProgresoTraslado,
  approveTraslado,
  registrarSalidaGarita,
  registrarLlegadaGarita,
  finalizarTraslado,
  obtenerChoferes,
  obtenerPlantas,
} from '../controllers/Traslados_controllers.js';
import { verificarTokenJWT } from '../middlewares/JWT.js';

const router = express.Router();

// Formularios de Creación (Usuarios)
router.get('/choferes', verificarTokenJWT, obtenerChoferes);
router.get('/plantas', verificarTokenJWT, obtenerPlantas);
router.post('/empresarial', verificarTokenJWT, createTrasladoEmpresarial);
router.post('/personal', verificarTokenJWT, createTrasladoPersonal);
router.post('/privado', verificarTokenJWT, createTrasladoPrivado);

// Histórico y Progreso (Usuarios, Jefes, Admin)
router.get('/historial', verificarTokenJWT, getTraslados);
router.get('/progreso/:id', verificarTokenJWT, getProgresoTraslado);

// Aprobación (Jefes)
router.put('/approve/:id', verificarTokenJWT, approveTraslado);

// Operaciones en Garita (Seguridad)
router.put('/garita/salida/:id', verificarTokenJWT, registrarSalidaGarita);
router.put('/garita/llegada/:id', verificarTokenJWT, registrarLlegadaGarita);
router.put('/finalizar/:id', verificarTokenJWT, finalizarTraslado);

export default router;
