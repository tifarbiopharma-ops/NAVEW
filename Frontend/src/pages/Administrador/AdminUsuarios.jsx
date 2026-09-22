import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import useFetch from '../../hooks/useFetch';
import storeAuth from '../../context/storeAuth';
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <ToastContainer />
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6 mb-6">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Panel administrativo</p>
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold text-slate-950">Gestión de usuarios</h1>
              <p className="max-w-2xl text-slate-600">Visualiza, filtra y administra todos los usuarios del sistema en un solo lugar.</p>
            </div>
          </div>

          <div className="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto_auto_auto] items-end mb-6">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Buscar usuario</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nombre, email o cédula"
                  className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                />
                {searchError && (
                  <p className="mt-2 text-sm font-medium text-red-600">{searchError}</p>
                )}
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Filtrar por rol</span>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
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
                className="inline-flex h-14 items-center justify-center rounded-3xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Limpiar
              </button>

              <button
                type="button"
                onClick={handleCrearUsuario}
                className="inline-flex h-14 items-center justify-center rounded-3xl bg-[#17243D] px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
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
