// Quién es jefe de quién lo define el organigrama, no NAVEW. NAVEW solo decide,
// con los roles de sus usuarios, quién de esos jefes puede aprobar.
//
// ORGANIGRAMA_FUENTE=panel   → API del panel del directorio (fuente oficial).
// ORGANIGRAMA_FUENTE=interno → réplica temporal sobre la base (por defecto, para pruebas).
import * as interno from './interno.js';
import * as panelDirectorio from './panelDirectorio.js';

const FUENTE = String(process.env.ORGANIGRAMA_FUENTE || 'interno').trim().toLowerCase();
const fuente = FUENTE === 'panel' ? panelDirectorio : interno;

const idValido = (valor) => {
  const id = Number(valor);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

/** @returns {Promise<{ jefes: number[], raiz: boolean, saltados: number[] }>} */
const obtenerJefes = async (idColaborador) => {
  const id = idValido(idColaborador);
  if (!id) return { jefes: [], raiz: false, saltados: [] };
  return fuente.obtenerJefes(id);
};

/** @returns {Promise<number[]>} */
const obtenerColaboradoresACargo = async (idJefe) => {
  const id = idValido(idJefe);
  if (!id) return [];
  return fuente.obtenerColaboradoresACargo(id);
};

export { FUENTE as FUENTE_ORGANIGRAMA, obtenerJefes, obtenerColaboradoresACargo };
