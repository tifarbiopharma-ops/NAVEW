import { useNavigate } from 'react-router-dom';

export const Forbidden = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-linear-to-br from-red-50 to-red-100" style={{ fontFamily: 'Gowun Batang, serif' }}>
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-600 mb-4">403</h1>
        <h2 className="text-3xl font-semibold text-slate-900 mb-2">Acceso Denegado</h2>
        <p className="text-lg text-slate-600 mb-8">No tienes permisos para acceder a esta página.</p>
        
        <button
          onClick={() => navigate('/dashboard/tablas')}
          className="inline-flex items-center justify-center rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          Volver al Dashboard
        </button>
      </div>
    </div>
  );
};

export default Forbidden;
