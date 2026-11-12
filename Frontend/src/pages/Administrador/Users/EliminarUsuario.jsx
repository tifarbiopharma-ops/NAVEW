import { useState } from 'react';
import { toast } from 'react-toastify';
import useFetch from '../../../hooks/useFetch';

const EliminarUsuario = ({ id, onDeleted, token }) => {
  const { fetchDataBackend } = useFetch();
  const [eliminando, setEliminando] = useState(false);

  const handleEliminar = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      return;
    }

    setEliminando(true);
    try {
      const url = `${import.meta.env.VITE_BACKEND_URL}/api/users/usuarios/${id}`;
      const response = await fetchDataBackend(url, null, 'DELETE', token);

      if (response?.msg) {
        toast.success('Usuario eliminado correctamente');
        onDeleted(id);
      } else {
        toast.error(response?.msg || 'No se pudo eliminar el usuario');
      }
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      toast.error('Error eliminando el usuario');
    } finally {
      setEliminando(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleEliminar}
      disabled={eliminando}
      className="shrink-0 rounded-xl bg-error px-3 py-2 text-xs font-semibold text-inverso transition hover:bg-error"
    >
      {eliminando ? 'Eliminando...' : 'Eliminar'}
    </button>
  );
};

export default EliminarUsuario;
