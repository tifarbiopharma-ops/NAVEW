import { registrarReporteTraslado } from '../utils/reportesTraslados.js';
import { registrarReporteEnvio } from '../utils/reportesEnvios.js';
import { registrarReporteAcceso } from '../utils/reportesAccesos.js';

// Roles que operan en garita (escaneo de QR y registro de movimientos físicos).
const ROLES_GARITA = ['supervisor', 'administrador'];

const ACCION_DENEGADA = 'INTENTO_NO_AUTORIZADO';
const SIN_ID = 'SIN_ID';

// Cada módulo registra los intentos rechazados en su propia tabla de reportes.
const auditoresPorModulo = {
  traslado: (datos, id) => registrarReporteTraslado({ ...datos, idTraslado: id }),
  envio: (datos, id) => registrarReporteEnvio({ ...datos, idPaquete: id }),
  acceso: (datos, id) => registrarReporteAcceso({ ...datos, idAcceso: id }),
};

/**
 * Registra en la auditoría del módulo un intento rechazado por permisos.
 * Nunca lanza: un fallo de auditoría no debe cambiar la respuesta al usuario.
 */
const registrarIntentoDenegado = async (req, modulo, idSolicitud, motivo) => {
  const auditar = auditoresPorModulo[modulo];
  if (!auditar || !req.user?.id) return;

  const id = String(idSolicitud ?? '').trim().slice(0, 36) || SIN_ID;

  try {
    await auditar({
      usuarioId: req.user.id,
      usuarioNombre: req.user.nombre,
      accion: ACCION_DENEGADA,
      detalles: {
        rol: req.user.rol,
        metodo: req.method,
        ruta: req.baseUrl + req.path,
        motivo,
      },
    }, id);
  } catch (error) {
    console.error('No se pudo auditar el intento denegado:', error.code || 'ERROR');
  }
};

/**
 * Deja pasar solo a los roles indicados. Debe ir después de verificarTokenJWT.
 *
 * @param {string[]} roles - Roles permitidos.
 * @param {object} [opciones]
 * @param {'traslado'|'envio'|'acceso'} [opciones.modulo] - Tabla donde auditar el rechazo.
 * @param {(req) => string|undefined} [opciones.obtenerId] - Extrae el ID de la solicitud afectada.
 * @param {string} [opciones.mensaje] - Mensaje para el 403.
 */
const permitirRoles = (roles, { modulo, obtenerId, mensaje } = {}) => {
  const permitidos = roles.map((rol) => rol.toLowerCase());

  return async (req, res, next) => {
    const rol = String(req.user?.rol || '').trim().toLowerCase();

    if (permitidos.includes(rol)) return next();

    await registrarIntentoDenegado(req, modulo, obtenerId?.(req), 'rol_no_permitido');

    return res.status(403).json({
      msg: mensaje || 'No tienes permiso para realizar esta acción',
    });
  };
};

export { ROLES_GARITA, permitirRoles, registrarIntentoDenegado };
