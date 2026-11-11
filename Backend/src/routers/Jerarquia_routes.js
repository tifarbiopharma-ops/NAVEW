import express from 'express';
import { verificarTokenJWT } from '../middlewares/JWT.js';
import { obtenerOrganigrama, guardarColoresOrganigrama } from '../controllers/Jerarquia_controllers.js';

const router = express.Router();

const permitirOrganigrama = (req, res, next) => {
  const rol = String(req.user?.rol || '').trim().toLowerCase().replace(/\s+/g, '');
  if (rol === 'administrador' || rol === 'talentohumano') return next();
  return res.status(403).json({ msg: 'Acceso restringido al organigrama' });
};

router.get('/organigrama', verificarTokenJWT, permitirOrganigrama, obtenerOrganigrama);
router.put('/organigrama/colores', verificarTokenJWT, permitirOrganigrama, guardarColoresOrganigrama);

export default router;
