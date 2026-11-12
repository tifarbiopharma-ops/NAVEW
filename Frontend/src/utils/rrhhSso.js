import axios from 'axios';

export const obtenerDestinoRRHH = () => {
  const configurada = import.meta.env.VITE_RRHH_URL;
  if (!configurada) {
    throw new Error('Falta configurar la dirección del panel de Talento Humano.');
  }

  let destino;
  try {
    destino = new URL(configurada);
  } catch {
    throw new Error('La dirección del panel de Talento Humano no es válida.');
  }

  const esLocal = ['localhost', '127.0.0.1'].includes(destino.hostname);
  if (destino.protocol !== 'https:' && !(esLocal && destino.protocol === 'http:')) {
    throw new Error('El panel de Talento Humano debe usar HTTPS.');
  }

  return destino.origin;
};

export const redirigirATalentoHumano = async (token) => {
  const destino = obtenerDestinoRRHH();
  const respuesta = await axios.post(
    `${import.meta.env.VITE_BACKEND_URL}/api/users/sso/rrhh/codigo`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (typeof respuesta.data?.code !== 'string') {
    throw new Error('NAVEW no entregó un código de acceso para Talento Humano.');
  }

  const form = document.createElement('form');
  form.method = 'POST';
  form.target = '_top';
  form.action = `${destino}/sso/consume`;
  form.hidden = true;

  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = 'code';
  input.value = respuesta.data.code;
  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
};
