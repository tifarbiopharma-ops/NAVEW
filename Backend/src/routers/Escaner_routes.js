import express from 'express';
import { verificarTokenJWT } from '../middlewares/JWT.js';
import { verificarQRPaquetería } from '../controllers/Escaner_controllers.js';

const router = express.Router();
// Endpoint para verificar QR de paquetería
// POST- /api/escaner/paqueteria 
router.post('/paqueteria', verificarTokenJWT, verificarQRPaquetería);
export default router;