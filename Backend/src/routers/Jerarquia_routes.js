import express from 'express';
import { verificarTokenJWT } from '../middlewares/JWT.js';
import { obtenerOrganigrama, guardarColoresOrganigrama } from '../controllers/Jerarquia_controllers.js';

const router = express.Router();

router.get('/organigrama', verificarTokenJWT, obtenerOrganigrama);
router.put('/organigrama/colores', verificarTokenJWT, guardarColoresOrganigrama);

export default router;