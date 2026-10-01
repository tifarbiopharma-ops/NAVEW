import express from 'express';
import { verificarTokenJWT } from '../middlewares/JWT.js';
import {
	obtenerCatalogosAcceso,
	crearAccesoExterno,
	obtenerAccesosExternos,
	aprobarAccesoExterno,
} from '../controllers/Accesos_controllers.js';

const router = express.Router();

router.get('/catalogos', verificarTokenJWT, obtenerCatalogosAcceso);
router.post('/', verificarTokenJWT, crearAccesoExterno);
router.get('/historial', verificarTokenJWT, obtenerAccesosExternos);
router.put('/approve/:id', verificarTokenJWT, aprobarAccesoExterno);

export default router;
