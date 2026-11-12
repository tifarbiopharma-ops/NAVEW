import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import useFetch from '../../../hooks/useFetch';
import storeAuth from '../../../context/storeAuth';
import UsuariosList from './UsuariosList';

const AdminUsuarios = () => {
  const navigate = useNavigate();
  const { fetchDataBackend } = useFetch();
  const { token } = storeAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('Todos');

  const obtenerUsuarios = async () => {
    setLoading(true);
    try {
      const url = `${import.meta.env.VITE_BACKEND_URL}/api/users/usuarios`;
      const response = await fetchDataBackend(url, null, 'GET', token);

      if (response?.usuarios) {
        setUsuarios(response.usuarios);
      } else {
        toast.error('No se pudo cargar la lista de usuarios');
      }
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      toast.error('Error al cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      obtenerUsuarios();
    }
  }, [token]);

  const roles = useMemo(() => {
    const uniqueRoles = Array.from(new Set(usuarios.map((usuario) => usuario.rol).filter(Boolean)));
    return ['Todos', ...uniqueRoles];
  }, [usuarios]);

  const searchError = searchTerm.length > 70 ? 'La búsqueda no puede tener más de 70 caracteres' : '';

  const filteredUsuarios = useMemo(() => {
    return usuarios.filter((usuario) => {
      const search = searchTerm.toLowerCase().trim();
      const matchesSearch =
        usuario.nombre?.toLowerCase().includes(search) ||
        usuario.email?.toLowerCase().includes(search) ||
        usuario.username?.toLowerCase().includes(search) ||
        usuario.cedula?.toString().includes(search);

      const matchesRole = filterRole === 'Todos' || usuario.rol === filterRole;
      return matchesSearch && matchesRole;
    });
  }, [usuarios, searchTerm, filterRole]);

  const handleCrearUsuario = () => {
    navigate('/dashboard/admin/usuarios/nuevo');
  };

  const handleEditarUsuario = (usuario) => {
    navigate(`/dashboard/admin/usuarios/editar/${usuario.id}`);
  };

  const handleUsuarioEliminado = (id) => {
    setUsuarios((prev) => prev.filter((usuario) => usuario.id !== id));
  };

  return (
    <div className="min-h-screen bg-fondo text-principal">
      <ToastContainer />
      <div className="w-full min-w-0 max-w-[1600px] mx-auto px-3 py-6 sm:px-5 lg:px-6">
        <div className="space-y-6 mb-6">
          <div className="space-y-3">
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold text-principal">Gestión de usuarios</h1>
              <p className="max-w-2xl text-texto-secundario">Visualiza, filtra y administra todos los usuarios del sistema en un solo lugar.</p>
            </div>
          </div>

          <div className="rounded-4xl border border-borde bg-superficie p-6 shadow-sm shadow-borde/50">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto_auto_auto] items-end mb-6">
              <label className="block">
                <span className="text-sm font-medium text-texto-secundario">Buscar usuario</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nombre, email o cédula"
                  className="mt-2 w-full rounded-3xl border border-borde bg-fondo px-4 py-3 text-sm text-principal outline-none transition focus:border-acento focus:ring-2 focus:ring-suave"
                />
                {searchError && (
                  <p className="mt-2 text-sm font-medium text-error">{searchError}</p>
                )}
              </label>

              <label className="block">
                <span className="text-sm font-medium text-texto-secundario">Filtrar por rol</span>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="mt-2 w-full rounded-3xl border border-borde bg-fondo px-4 py-3 text-sm text-principal outline-none transition focus:border-acento focus:ring-2 focus:ring-suave"
                >
                  {roles.map((rol) => (
                    <option key={rol} value={rol}>
                      {rol}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFilterRole('Todos');
                }}
                className="inline-flex h-14 items-center justify-center rounded-3xl border border-borde-fuerte bg-superficie px-5 text-sm font-semibold text-texto-secundario transition hover:bg-fondo"
              >
                Limpiar
              </button>

              <button
                type="button"
                onClick={handleCrearUsuario}
                className="inline-flex h-14 items-center justify-center rounded-3xl bg-principal px-5 text-sm font-semibold text-inverso transition hover:bg-principal-hover"
              >
                Nuevo Usuario
              </button>
            </div>

            <UsuariosList
              usuarios={filteredUsuarios}
              loading={loading}
              onEdit={handleEditarUsuario}
              onDelete={handleUsuarioEliminado}
              token={token}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminUsuarios;
