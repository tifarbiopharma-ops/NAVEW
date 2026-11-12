import storeAuth from '../context/storeAuth';
import { obtenerDestinoRRHH } from './rrhhSso';

export const cerrarSesionNavew = () => {
  storeAuth.getState().logout();
  window.dispatchEvent(new Event('auth:logout'));
  let destino = '/login';
  if (new URLSearchParams(window.location.search).get('destino') === 'directorio') {
    try {
      destino = new URL('/vextensiones', obtenerDestinoRRHH()).href;
    } catch {
      // La sesión queda cerrada aunque falte la configuración del directorio.
    }
  }
  window.top.location.replace(destino);
};
