import express from 'express';
import { verificarTokenJWT } from '../middlewares/JWT.js';
import { obtenerConductoresEnvio, asignarConductorEnvios } from '../controllers/asignacionConductorControlador.js';
import {
	obtenerCatalogosEnvio,
	crearEnvioPaqueteria,
	obtenerEnviosPaqueteria,
} from '../controllers/Envios_controllers.js';

const router = express.Router();

router.get('/catalogos', verificarTokenJWT, obtenerCatalogosEnvio);
router.post('/', verificarTokenJWT, crearEnvioPaqueteria);
router.get('/historial', verificarTokenJWT, obtenerEnviosPaqueteria);
router.get('/conductores', verificarTokenJWT, obtenerConductoresEnvio);
router.put('/conductor', verificarTokenJWT, asignarConductorEnvios);

export default router;
