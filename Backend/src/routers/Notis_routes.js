
import { Router } from "express";

import {
  obtenerDatosAvisoLlegada,
  enviarAvisoLlegada
} from "../controllers//Notis_controllers.js";
import { verificarTokenJWT } from "../middlewares/JWT.js";

const router = Router();

// Middleware de autenticación.
// Debes importar aquí el que ya utiliza tu proyecto.
// import verificarToken from "../middlewares/auth.js";

// Obtener las ubicaciones y la planta asignada al supervisor
router.get("/datos",verificarTokenJWT,obtenerDatosAvisoLlegada);

// Enviar la notificación de llegada del camión a Telegram
router.post("/enviar",verificarTokenJWT,enviarAvisoLlegada);

export default router;
