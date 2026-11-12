// Valores de chk_accesos_estado. La interfaz conserva sus etiquetas legibles.
const etiquetasEstadosAcceso = Object.freeze({
  SOLICITADO: 'Solicitado',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
  CANCELADO: 'Cancelado',
  'ENTRADA REGISTRADA': 'Entrada registrada',
  FINALIZADO: 'Finalizado',
});

const claveEstadoAcceso = (estado) => String(estado ?? '').trim().toUpperCase();

export const estadoAccesoEnBase = (estado) => {
  const clave = claveEstadoAcceso(estado);
  if (!Object.hasOwn(etiquetasEstadosAcceso, clave)) {
    throw new Error('Estado de acceso no válido');
  }
  return clave;
};

export const mostrarEstadoAcceso = (estado) => {
  const clave = claveEstadoAcceso(estado);
  return Object.hasOwn(etiquetasEstadosAcceso, clave)
    ? etiquetasEstadosAcceso[clave]
    : estado;
};
