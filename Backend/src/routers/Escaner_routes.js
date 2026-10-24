import express from 'express';
import { verificarTokenJWT } from '../middlewares/JWT.js';
import { ROLES_GARITA, permitirRoles } from '../middlewares/roles.js';
import { verificarQRPaquetería, verificarQRTransporte, verificarQRExterno } from '../controllers/Escaner_controllers.js';

const router = express.Router();

const MENSAJE_GARITA = 'Solo el personal de garita puede registrar movimientos con QR';

// Solo garita registra salidas y llegadas; el intento de cualquier otro rol queda auditado.
const soloGarita = (modulo, obtenerId) =>
  permitirRoles(ROLES_GARITA, { modulo, obtenerId, mensaje: MENSAJE_GARITA });

// Formato de los QR: PAQUETERIA|<id> y EXTERNO|<id>|ACOMPANANTES:<n>|<código>
const idDesdeQR = (req) => String(req.body?.token_qr || '').split('|')[1];

// Endpoint para verificar QR de paquetería
// POST- /api/escaner/paqueteria
router.post('/paqueteria', verificarTokenJWT, soloGarita('envio', idDesdeQR), verificarQRPaquetería);
// Endpoint para verificar QR de transporte (el QR es el ID del traslado)
// POST- /api/escaner/transporte
router.post('/transporte', verificarTokenJWT, soloGarita('traslado', (req) => req.body?.token_qr), verificarQRTransporte);
// Endpoint para verificar QR de acceso externo
// POST- /api/escaner/externo
router.post('/externo', verificarTokenJWT, soloGarita('acceso', idDesdeQR), verificarQRExterno);
export default router;
