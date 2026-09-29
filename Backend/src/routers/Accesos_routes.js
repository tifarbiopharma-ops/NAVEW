import express from 'express';
import { verificarTokenJWT } from '../middlewares/JWT.js';
import {
	obtenerCatalogosAcceso,
	crearAccesoExterno,
	obtenerAccesosExternos,
} from '../controllers/Accesos_controllers.js';

const router = express.Router();

router.get('/catalogos', verificarTokenJWT, obtenerCatalogosAcceso);
router.post('/', verificarTokenJWT, crearAccesoExterno);
router.get('/historial', verificarTokenJWT, obtenerAccesosExternos);

export default router;
