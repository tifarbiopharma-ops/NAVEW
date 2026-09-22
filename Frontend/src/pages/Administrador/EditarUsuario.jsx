import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate, useParams } from 'react-router-dom';
import useFetch from '../../hooks/useFetch';
import storeAuth from '../../context/storeAuth';

const EditarUsuario = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = storeAuth();
  const { fetchDataBackend } = useFetch();

  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateNombre = useCallback((value) => {
    if (!value || value.trim() === '') {
      return 'El nombre es obligatorio';
    }

    const trimmed = value.trim();
    
    // Verificar que no contenga números
    if (/\d/.test(trimmed)) {
      return 'El nombre no puede contener números';
    }
    
    // Verificar longitud total
    if (trimmed.length < 2) {
      return 'El nombre debe tener mínimo 2 caracteres';
    }
    if (trimmed.length > 130) {
      return 'El nombre debe tener máximo 130 caracteres';
    }

    // Dividir por espacios y validar palabras
    const palabras = trimmed.split(/\s+/);
    
    if (palabras.length !== 4) {
      return 'Debe tener 2 nombres y 2 apellidos (4 palabras)';
    }

    // Validar cada palabra
    for (let i = 0; i < palabras.length; i++) {
      const palabra = palabras[i];
      
      if (palabra.length < 2) {
        return `Cada palabra debe tener mínimo 2 caracteres`;
      }
      if (palabra.length > 30) {
        return `Cada palabra debe tener máximo 30 caracteres`;
      }
      
      // Validar que la primera letra sea mayúscula
      if (palabra[0] !== palabra[0].toUpperCase()) {
        return `Cada palabra debe comenzar con mayúscula`;
      }
      
      // Validar que las demás letras sean minúsculas
      if (palabra.slice(1) !== palabra.slice(1).toLowerCase()) {
        return `Solo la primera letra debe ser mayúscula`;
      }
    }

    return true;
  }, []);

  const validateCedula = useCallback(async (value) => {
    if (!value || value.trim() === '') {
      return 'La cédula es obligatoria';
    }

    const cedula = value.trim();

    // Validar que solo contenga números
    if (!/^\d+$/.test(cedula)) {
      return 'La cédula solo debe contener números';
    }

    if (!/^\d{10,}$/.test(cedula)) {
      return 'La cédula debe tener mínimo 10 dígitos';
    }

    // Verificar que no exista (excepto el usuario actual)
    try {
      const url = `${import.meta.env.VITE_BACKEND_URL}/api/users/usuarios`;
      const response = await fetchDataBackend(url, null, 'GET', token);
      
      if (response?.usuarios && Array.isArray(response.usuarios)) {
        const exists = response.usuarios.some(u => u.cedula === cedula && u.id !== usuario?.id);
        if (exists) {
          return 'Esta cédula ya está registrada';
        }
      }
    } catch (error) {
      console.error('Error verificando cédula:', error);
    }

    return true;
  }, [fetchDataBackend, token, usuario?.id]);

  const validateEmail = useCallback(async (value) => {
    if (!value || value.trim() === '') {
      return 'El email es obligatorio';
    }

    const email = value.trim().toLowerCase();

    // Validar longitud
    if (email.length < 10) {
      return 'El email debe tener mínimo 10 caracteres';
    }
    if (email.length > 70) {
      return 'El email debe tener máximo 70 caracteres';
    }

    // Validar dominio
    const validDomains = ['@farbiopharma.com', '@inpel.com', '@clarel.com'];
    const hasValidDomain = validDomains.some(domain => email.endsWith(domain));
    
    if (!hasValidDomain) {
      return 'El email debe usar dominio @farbiopharma.com, @inpel.com o @clarel.com';
    }

    // Verificar que no exista (excepto el usuario actual)
    try {
      const url = `${import.meta.env.VITE_BACKEND_URL}/api/users/usuarios`;
      const response = await fetchDataBackend(url, null, 'GET', token);
      
      if (response?.usuarios && Array.isArray(response.usuarios)) {
        const exists = response.usuarios.some(u => u.email?.toLowerCase() === email && u.id !== usuario?.id);
        if (exists) {
          return 'Este email ya está registrado';
        }
      }
    } catch (error) {
      console.error('Error verificando email:', error);
    }

    return true;
  }, [fetchDataBackend, token, usuario?.id]);

  const validatePassword = useCallback((value) => {
    if (!value || value === '') {
      return true; // La contraseña es opcional en edición
    }

    if (value.length < 14) {
      return 'La contraseña debe tener mínimo 14 caracteres';
    }
    if (value.length > 20) {
      return 'La contraseña debe tener máximo 20 caracteres';
    }

    return true;
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isValidating },
    reset,
  } = useForm({
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      nombre: '',
      cedula: '',
      email: '',
      password: '',
      rol: 'solicitante',
      estado: 'activo',
    },
  });

  useEffect(() => {
    const obtenerUsuario = async () => {
      if (!token || !id) return;

      setLoading(true);
      try {
        const url = `${import.meta.env.VITE_BACKEND_URL}/api/users/usuarios/${id}`;
        const response = await fetchDataBackend(url, null, 'GET', token);

        if (response?.usuario) {
          setUsuario(response.usuario);
        } else {
          toast.error(response?.msg || 'No se pudo cargar el usuario');
          navigate('/dashboard/admin/usuarios');
        }
      } catch (error) {
        console.error('Error obteniendo el usuario:', error);
        toast.error('Error cargando el usuario');
        navigate('/dashboard/admin/usuarios');
      } finally {
        setLoading(false);
      }
    };

    obtenerUsuario();
  }, [id, token, fetchDataBackend, navigate]);

  useEffect(() => {
    if (!usuario) return;

    reset({
      nombre: usuario.nombre || '',
      cedula: usuario.cedula || '',
      email: usuario.email || '',
      password: '',
      rol: usuario.rol || 'solicitante',
      estado: usuario.estado || 'activo',
    });
  }, [usuario, reset]);

  const handleExit = () => {
    navigate('/dashboard/admin/usuarios');
  };

  const onSubmit = async (data) => {
    if (!usuario) return;

    setEnviando(true);

    try {
      const payload = {
        nombre: data.nombre,
        cedula: data.cedula,
        email: data.email,
        password: data.password || null,
        rol: data.rol,
        estado: data.estado,
      };

      const url = `${import.meta.env.VITE_BACKEND_URL}/api/users/usuarios/${usuario.id}`;
      const response = await fetchDataBackend(url, payload, 'PUT', token);

      if (response?.usuario) {
        toast.success('Usuario actualizado correctamente', {
          onClose: handleExit,
          autoClose: 2000,
        });
      } else {
        toast.error(response?.msg || 'No se pudo actualizar el usuario');
      }
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      toast.error('Error actualizando el usuario');
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50">
            <div className="text-center py-16 text-slate-500">Cargando usuario...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <ToastContainer />
        <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50">
            <div className="text-center py-16 text-slate-500">No se encontró el usuario seleccionado.</div>
            <div className="mt-6 text-center">
              <button
                onClick={handleExit}
                className="rounded-3xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <ToastContainer />
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-4 mb-6">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.22em] text-slate-500">Administración de usuarios</p>
            <h1 className="text-4xl font-semibold text-slate-950">Editar usuario</h1>
            <p className="max-w-2xl text-slate-600">Actualiza los datos del usuario seleccionado.</p>
          </div>
        </div>

        <div className="rounded-4xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50 mb-8">
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex flex-col">
                <label className="text-slate-800 font-semibold mb-2">Nombre *</label>
                <input
                  type="text"
                  placeholder="Ej: Juan Carlos Pérez López"
                  className={`rounded-3xl border px-4 py-3 text-slate-900 outline-none transition focus:ring-2 ${
                    errors.nombre
                      ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-100'
                      : 'border-slate-200 bg-slate-50 focus:border-slate-400 focus:ring-slate-200'
                  }`}
                  {...register('nombre', { validate: validateNombre })}
                />
                {errors.nombre && (
                  <p className="text-red-600 text-sm mt-2 font-medium">{errors.nombre.message}</p>
                )}
              </div>

              <div className="flex flex-col">
                <label className="text-slate-800 font-semibold mb-2">Cédula *</label>
                <input
                  type="text"
                  placeholder="Ej: 1234567890"
                  inputMode="numeric"
                  className={`rounded-3xl border px-4 py-3 text-slate-900 outline-none transition focus:ring-2 ${
                    errors.cedula
                      ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-100'
                      : 'border-slate-200 bg-slate-50 focus:border-slate-400 focus:ring-slate-200'
                  }`}
                  {...register('cedula', { validate: validateCedula })}
                />
                {errors.cedula && (
                  <p className="text-red-600 text-sm mt-2 font-medium">{errors.cedula.message}</p>
                )}
                {isValidating && !errors.cedula && (
                  <p className="text-slate-500 text-xs mt-2">Verificando cédula...</p>
                )}
              </div>

              <div className="flex flex-col">
                <label className="text-slate-800 font-semibold mb-2">Email *</label>
                <input
                  type="email"
                  placeholder="usuario@farbiopharma.com"
                  className={`rounded-3xl border px-4 py-3 text-slate-900 outline-none transition focus:ring-2 ${
                    errors.email
                      ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-100'
                      : 'border-slate-200 bg-slate-50 focus:border-slate-400 focus:ring-slate-200'
                  }`}
                  {...register('email', { validate: validateEmail })}
                />
                {errors.email && (
                  <p className="text-red-600 text-sm mt-2 font-medium">{errors.email.message}</p>
                )}
                {isValidating && !errors.email && (
                  <p className="text-slate-500 text-xs mt-2">Verificando email...</p>
                )}
              </div>

              <div className="flex flex-col">
                <label className="text-slate-800 font-semibold mb-2">Rol *</label>
                <select
                  className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  {...register('rol', { required: 'El rol es obligatorio' })}
                >
                  <option value="administrador">Administrador</option>
                  <option value="jefe">Jefe</option>
                  <option value="solicitante">Solicitante</option>
                  <option value="supervisor">Supervisor</option>
                </select>
                {errors.rol && <p className="text-red-600 text-sm mt-1">{errors.rol.message}</p>}
              </div>

              <div className="flex flex-col md:col-span-1">
                <label className="text-slate-800 font-semibold mb-2">Contraseña (opcional)</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••••"
                    className={`w-full rounded-3xl border px-4 py-3 pr-12 text-slate-900 outline-none transition focus:ring-2 ${
                      errors.password
                        ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-100'
                        : 'border-slate-200 bg-slate-50 focus:border-slate-400 focus:ring-slate-200'
                    }`}
                    {...register('password', { validate: validatePassword })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.05 10.05 0 0112 20c-6 0-10-8-10-8a18.92 18.92 0 014.05-5.48" />
                        <path d="M1 1l22 22" />
                        <path d="M9.88 9.88a3 3 0 014.24 4.24" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-600 text-sm mt-2 font-medium">{errors.password.message}</p>
                )}
              </div>

              <div className="flex flex-col">
                <label className="text-slate-800 font-semibold mb-2">Estado *</label>
                <select
                  className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  {...register('estado', { required: 'El estado es obligatorio' })}
                >
                  <option value="activo">Activo</option>
                  <option value="bloqueado">Bloqueado</option>
                </select>
                {errors.estado && <p className="text-red-600 text-sm mt-2 font-medium">{errors.estado.message}</p>}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 justify-end mt-4">
              <button
                type="button"
                onClick={handleExit}
                className="rounded-3xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando || isValidating}
                className="rounded-3xl bg-[#17243D] px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enviando ? 'Actualizando...' : isValidating ? 'Validando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditarUsuario;
