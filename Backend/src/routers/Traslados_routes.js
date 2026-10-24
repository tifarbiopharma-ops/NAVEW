import express from 'express';
import {
  createTrasladoEmpresarial,
  createTrasladoPersonal,
  createTrasladoPrivado,
  getTraslados,
  approveTraslado,
  obtenerChoferes,
  obtenerPlantas,
  finalizarTraslado,
  subirFacturaTraslado,
  verFacturaTraslado,
} from '../controllers/Traslados_controllers.js';
import { verificarTokenJWT } from '../middlewares/JWT.js';
import { recibirArchivo } from '../middlewares/archivo.js';

const router = express.Router();

// Formularios de Creación (Usuarios)
router.get('/choferes', verificarTokenJWT, obtenerChoferes);
router.get('/plantas', verificarTokenJWT, obtenerPlantas);
router.post('/empresarial', verificarTokenJWT, createTrasladoEmpresarial);
router.post('/personal', verificarTokenJWT, createTrasladoPersonal);
router.post('/privado', verificarTokenJWT, createTrasladoPrivado);

// Histórico y Progreso (Usuarios, Jefes, Admin)
router.get('/historial', verificarTokenJWT, getTraslados);
// Aprobación (Jefes)
router.put('/approve/:id', verificarTokenJWT, approveTraslado);

// Cierre de traslado PERSONAL con el KM final (garita). El permiso se valida en el controlador.
router.put('/finalizar/:id', verificarTokenJWT, finalizarTraslado);

// Factura del traslado PRIVADO: la sube el solicitante y la ven él, sus superiores y el administrador.
router.put('/:id/factura', verificarTokenJWT, recibirArchivo('factura'), subirFacturaTraslado);
router.get('/:id/factura', verificarTokenJWT, verFacturaTraslado);

export default router;
