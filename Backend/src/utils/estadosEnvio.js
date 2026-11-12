// Valores de chk_envios_estado. La base distingue mayúsculas y minúsculas.
const etiquetasEstadosEnvio = Object.freeze({
  SOLICITADO: 'Solicitado',
  'EN CAMINO': 'En camino',
  FINALIZADO: 'Finalizado',
});

const claveEstadoEnvio = (estado) => String(estado ?? '').trim().toUpperCase();

export const estadoEnvioEnBase = (estado) => {
  const clave = claveEstadoEnvio(estado);
  if (!Object.hasOwn(etiquetasEstadosEnvio, clave)) {
    throw new Error('Estado de envío no válido');
  }
  return clave;
};

export const mostrarEstadoEnvio = (estado) => {
  const clave = claveEstadoEnvio(estado);
  return Object.hasOwn(etiquetasEstadosEnvio, clave)
    ? etiquetasEstadosEnvio[clave]
    : estado;
};
