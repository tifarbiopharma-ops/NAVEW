import express from 'express';
import { verificarTokenJWT } from '../middlewares/JWT.js';
import {
	obtenerCatalogosEnvio,
	crearEnvioPaqueteria,
	obtenerEnviosPaqueteria,
} from '../controllers/Envios_controllers.js';

const router = express.Router();

router.get('/catalogos', verificarTokenJWT, obtenerCatalogosEnvio);
router.post('/', verificarTokenJWT, crearEnvioPaqueteria);
router.get('/historial', verificarTokenJWT, obtenerEnviosPaqueteria);

export default router;
