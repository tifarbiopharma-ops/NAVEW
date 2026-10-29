// Error que el usuario puede entender y resolver (organigrama sin configurar,
// faltan campos...). Su mensaje se muestra tal cual con su código HTTP.
class ErrorNegocio extends Error {
  constructor(mensaje, status = 400) {
    super(mensaje);
    this.name = 'ErrorNegocio';
    this.status = status;
  }
}

// La base rechaza una planta, chofer o colaborador que no existe (clave foránea).
const REFERENCIA_INEXISTENTE = 'ER_NO_REFERENCED_ROW_2';

/**
 * Responde un error de creación: los de negocio con su mensaje, el resto con
 * un 500 genérico para no exponer detalles técnicos (el detalle va al log).
 */
const responderError = (res, error, mensajeGenerico) => {
  if (error instanceof ErrorNegocio) {
    return res.status(error.status).json({ msg: error.message });
  }
  if (error?.code === REFERENCIA_INEXISTENTE) {
    return res.status(400).json({ msg: 'La planta o el chofer seleccionado no existe' });
  }

  console.error(mensajeGenerico, error);
  return res.status(500).json({ msg: mensajeGenerico });
};

export { ErrorNegocio, responderError };
