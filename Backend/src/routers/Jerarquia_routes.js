import express from 'express';
import { verificarTokenJWT } from '../middlewares/JWT.js';
import { obtenerOrganigrama } from '../controllers/Jerarquia_controllers.js';

const router = express.Router();

router.get('/organigrama', verificarTokenJWT, obtenerOrganigrama);

export default router;