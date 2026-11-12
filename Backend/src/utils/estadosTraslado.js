// MySQL valida estos valores con una intercalación que distingue mayúsculas.
// Las etiquetas mantienen el formato usado por la interfaz y la auditoría.
const etiquetasEstadosTraslado = Object.freeze({
  SOLICITADO: 'Solicitado',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
  CANCELADO: 'Cancelado',
  'EN CAMINO': 'En camino',
  'PENDIENTE KM FINAL': 'Pendiente KM final',
  'PENDIENTE FACTURA': 'Pendiente factura',
  FINALIZADO: 'Finalizado',
});

const claveEstadoTraslado = (estado) => String(estado ?? '').trim().toUpperCase();

export const estadoTrasladoEnBase = (estado) => {
  const clave = claveEstadoTraslado(estado);
  if (!Object.hasOwn(etiquetasEstadosTraslado, clave)) {
    throw new Error('Estado de traslado no válido');
  }
  return clave;
};

export const mostrarEstadoTraslado = (estado) => {
  const clave = claveEstadoTraslado(estado);
  return Object.hasOwn(etiquetasEstadosTraslado, clave)
    ? etiquetasEstadosTraslado[clave]
    : estado;
};
