import express from 'express';
import { verificarTokenJWT } from '../middlewares/JWT.js';
import { verificarQRPaquetería, verificarQRTransporte, verificarQRExterno } from '../controllers/Escaner_controllers.js';

const router = express.Router();
// Endpoint para verificar QR de paquetería
// POST- /api/escaner/paqueteria 
router.post('/paqueteria', verificarTokenJWT, verificarQRPaquetería);
router.post('/transporte', verificarTokenJWT, verificarQRTransporte);
router.post('/externo', verificarTokenJWT, verificarQRExterno);
export default router;