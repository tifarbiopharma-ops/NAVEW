import { useState } from 'react';
import { toast } from 'react-toastify';
import useFetch from '../../hooks/useFetch';

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
      className="bg-[#EF3340] hover:bg-red-700 text-white px-4 py-2 rounded-lg transition text-sm font-semibold disabled:opacity-50"
    >
      {eliminando ? 'Eliminando...' : 'Eliminar'}
    </button>
  );
};

export default EliminarUsuario;
