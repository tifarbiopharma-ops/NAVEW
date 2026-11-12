import { useEffect, useRef, useState } from 'react';
import storeAuth from '../../context/storeAuth';
import { redirigirATalentoHumano } from '../../utils/rrhhSso';

// Se usa antes de montar el Dashboard cuando ya existe una sesión guardada.
export default function AccesoTalentoHumano({ token }) {
  const iniciado = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;
    redirigirATalentoHumano(token).catch((err) => {
      setError(err?.response?.data?.msg || err.message || 'No se pudo abrir Talento Humano.');
    });
  }, [token]);

  if (!error) return null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-superficie p-6 font-sans">
      <div className="max-w-md text-center">
        <p role="alert" className="text-sm text-error">{error}</p>
        <button type="button" className="mt-5 rounded-lg bg-principal px-5 py-3 text-sm text-inverso"
          onClick={() => { storeAuth.getState().logout(); window.location.replace('/login'); }}>
          Volver a iniciar sesión
        </button>
      </div>
    </main>
  );
}
