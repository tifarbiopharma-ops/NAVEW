import { useNavigate } from 'react-router-dom';

export const Forbidden = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-fondo" style={{ fontFamily: 'Gowun Batang, serif' }}>
      <div className="text-center">
        <h1 className="text-6xl font-bold text-error mb-4">403</h1>
        <h2 className="text-3xl font-semibold text-principal mb-2">Acceso Denegado</h2>
        <p className="text-lg text-texto-secundario mb-8">No tienes permisos para acceder a esta página.</p>
        
        <button
          onClick={() => navigate('/dashboard/tablas')}
          className="inline-flex items-center justify-center rounded-lg bg-principal px-6 py-3 text-sm font-semibold text-inverso transition hover:bg-principal-hover"
        >
          Volver al Dashboard
        </button>
      </div>
    </div>
  );
};

export default Forbidden;
