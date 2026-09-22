import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-4xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">404 - Página no encontrada</p>
          <h1 className="mt-4 text-5xl font-bold text-slate-900">Ups, esto no existe</h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            La ruta a la que intentas acceder no está disponible. Vuelve al inicio de sesión para continuar.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <button
            onClick={() => navigate('/login')}
            className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Ir al inicio de sesión
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Ir al dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
