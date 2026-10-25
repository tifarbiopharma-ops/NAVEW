// Fuente oficial del organigrama: la API del panel del directorio (BACK_FRONT_FARBIOPHARMA).
// Todavía no tenemos acceso; este es el contrato que se propone a Ariel.
//
// GET {ORGANIGRAMA_PANEL_URL}/api/colaboradores/:id/aprobador     (ya existe en el panel)
//   → { aprobadores: [{ id, nombre, cargo }], heredado, saltados, error, raiz }
//     `raiz: true` es nuevo: indica que el cargo no tiene superior (autoaprobación).
// GET {ORGANIGRAMA_PANEL_URL}/api/colaboradores/:id/subordinados  (nuevo)
//   → { subordinados: [{ id, nombre }] }  (toda la cadena hacia abajo, solo activos)
//
// Hoy esas rutas piden la sesión del panel; para NAVEW hace falta un token de
// servicio, enviado como `Authorization: Bearer {ORGANIGRAMA_PANEL_TOKEN}`.

const TIEMPO_MAXIMO_MS = 5000;

const consultar = async (ruta) => {
  const base = process.env.ORGANIGRAMA_PANEL_URL;
  if (!base) {
    throw new Error('Falta ORGANIGRAMA_PANEL_URL para consultar el organigrama del panel');
  }

  const respuesta = await fetch(`${base.replace(/\/$/, '')}${ruta}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${process.env.ORGANIGRAMA_PANEL_TOKEN || ''}`,
    },
    signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
  });

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new Error(datos.error || `El panel del directorio respondió ${respuesta.status}`);
  }
  return datos;
};

const obtenerJefes = async (idColaborador) => {
  const datos = await consultar(`/api/colaboradores/${idColaborador}/aprobador`);
  return {
    jefes: (datos.aprobadores || []).map((aprobador) => Number(aprobador.id)),
    raiz: datos.raiz === true,
    saltados: datos.saltados || [],
  };
};

const obtenerColaboradoresACargo = async (idJefe) => {
  const datos = await consultar(`/api/colaboradores/${idJefe}/subordinados`);
  return (datos.subordinados || []).map((subordinado) => Number(subordinado.id));
};

export { obtenerJefes, obtenerColaboradoresACargo };
