import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import storeAuth from '../../context/storeAuth';

export default function SsoRRHH() {
  const navigate = useNavigate();
  const setToken = storeAuth((state) => state.setToken);
  const iniciado = useRef(false);
  const [mensaje, setMensaje] = useState('Validando acceso...');

  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;

    const codigo = new URLSearchParams(window.location.hash.slice(1)).get('code');
    window.history.replaceState(null, '', window.location.pathname);

    if (!codigo) {
      setMensaje('No se recibio un codigo de acceso. Vuelve al menu de Talento Humano e intenta de nuevo.');
      return;
    }

    storeAuth.getState().logout();
    axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/users/sso/rrhh/canjear`, { code: codigo })
      .then(({ data }) => {
        if (!data?.token) throw new Error('NAVEW no devolvio una sesion valida.');
        setToken(data.token);
        navigate('/organigrama/rrhh', { replace: true });
      })
      .catch((error) => {
        setMensaje(
          error?.response?.data?.msg ||
          error?.message ||
          'No se pudo abrir el organigrama. Vuelve al menu de Talento Humano e intenta de nuevo.'
        );
      });
  }, [navigate, setToken]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo px-6 font-sans">
      <p role="status" className="max-w-lg text-center text-sm text-texto-secundario">{mensaje}</p>
    </main>
  );
}
