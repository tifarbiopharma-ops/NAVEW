
import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate, useParams } from 'react-router-dom';
import useFetch from '../../../hooks/useFetch';
import storeAuth from '../../../context/storeAuth';

// ==========================================
// GENERAR USERNAME
// PEREZ LOPEZ JUAN CARLOS -> JPEREZ
// ==========================================

const generarUsername = (nombreCompleto) => {
  const partes = String(nombreCompleto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean);

  if (partes.length < 3) return '';

  return `${partes[2].charAt(0)}${partes[0]}`;
};

const inputClasses =
  'w-full rounded-3xl border border-borde bg-fondo px-4 py-3 text-principal outline-none transition focus:border-acento focus:ring-2 focus:ring-suave';

const EditarUsuario = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = storeAuth();
  const { fetchDataBackend } = useFetch();

  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ==========================================
  // VALIDACIONES
  // ==========================================

  const validateNombre = useCallback((value) => {
    if (!value?.trim()) {
      return 'El nombre es obligatorio';
    }

    const nombre = value.trim();

    if (/\d/.test(nombre)) {
      return 'El nombre no puede contener números';
    }

    if (nombre.length > 130) {
      return 'El nombre debe tener máximo 130 caracteres';
    }

    const palabras = nombre.split(/\s+/);

    if (palabras.length < 3) {
      return 'Debe contener dos apellidos y al menos un nombre';
    }

    if (palabras.some(p => p.length < 2 || p.length > 30)) {
      return 'Cada palabra debe tener entre 2 y 30 caracteres';
    }

    return true;
  }, []);

  const validateCedula = useCallback(
    async (value) => {
      if (!/^\d{10}$/.test(value?.trim() || '')) {
        return 'La cédula debe tener exactamente 10 dígitos';
      }

      try {
        const url = `${import.meta.env.VITE_BACKEND_URL}/api/users/usuarios`;

        const response = await fetchDataBackend(
          url,
          null,
          'GET',
          token
        );

        if (Array.isArray(response?.usuarios)) {
          const existe = response.usuarios.some(
            u =>
              String(u.cedula).trim() === value.trim() &&
              String(u.id) !== String(id)
          );

          if (existe) {
            return 'Esta cédula ya está registrada';
          }
        }
      } catch (error) {
        console.error('Error verificando cédula:', error);
      }

      return true;
    },
    [fetchDataBackend, token, id]
  );

  const validateEmail = useCallback(
    async (value) => {
      if (!value?.trim()) return true;

      const email = value.trim().toLowerCase();

      if (email.length > 70) {
        return 'El correo debe tener máximo 70 caracteres';
      }

      const dominios = [
        '@farbiopharma.com',
        '@inpel.com',
        '@clarel.com'
      ];

      if (!dominios.some(d => email.endsWith(d))) {
        return 'El correo debe pertenecer a Farbiopharma, Inpel o Clarel';
      }

      try {
        const url = `${import.meta.env.VITE_BACKEND_URL}/api/users/usuarios`;

        const response = await fetchDataBackend(
          url,
          null,
          'GET',
          token
        );

        if (Array.isArray(response?.usuarios)) {
          const existe = response.usuarios.some(
            u =>
              u.email?.toLowerCase() === email &&
              String(u.id) !== String(id)
          );

          if (existe) {
            return 'Este correo ya está registrado';
          }
        }
      } catch (error) {
        console.error('Error verificando correo:', error);
      }

      return true;
    },
    [fetchDataBackend, token, id]
  );

  const validatePassword = useCallback((value) => {
    if (!value) return true;

    if (value.length < 14 || value.length > 20) {
      return 'La contraseña debe tener entre 14 y 20 caracteres';
    }

    return true;
  }, []);

  // ==========================================
  // FORMULARIO
  // ==========================================

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValidating },
    reset
  } = useForm({
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      nombre: '',
      cedula: '',
      email: '',
      password: '',
      rol: 'solicitante',
      estado: 'activo'
    }
  });

  const nombreActual = watch('nombre');

  // El username se calcula para vista previa.
  // El backend lo recalcula al guardar el nombre.
  const usernameGenerado = generarUsername(nombreActual);

  const usernameMostrado =
    nombreActual?.trim() === usuario?.nombre?.trim()
      ? usuario?.username || usernameGenerado
      : usernameGenerado;

  // ==========================================
  // OBTENER USUARIO
  // ==========================================

  useEffect(() => {
    if (!token || !id) return;

    let activo = true;

    const obtenerUsuario = async () => {
      setLoading(true);

      try {
        const url = `${import.meta.env.VITE_BACKEND_URL}/api/users/usuarios/${id}`;

        const response = await fetchDataBackend(
          url,
          null,
          'GET',
          token
        );

        if (!activo) return;

        if (response?.usuario) {
          setUsuario(response.usuario);
        } else {
          toast.error(
            response?.msg || 'No se pudo cargar el usuario'
          );

          navigate('/dashboard/admin/usuarios');
        }
      } catch (error) {
        if (!activo) return;

        console.error('Error obteniendo usuario:', error);
        toast.error('Error cargando el usuario');

        navigate('/dashboard/admin/usuarios');
      } finally {
        if (activo) setLoading(false);
      }
    };

    obtenerUsuario();

    return () => {
      activo = false;
    };
  }, [id, token, fetchDataBackend, navigate]);

  // ==========================================
  // CARGAR DATOS EN FORMULARIO
  // ==========================================

  useEffect(() => {
    if (!usuario) return;

    reset({
      nombre: usuario.nombre || '',
      cedula: usuario.cedula || '',
      email: usuario.email || '',
      password: '',
      rol: usuario.rol || 'solicitante',
      estado: usuario.estado || 'activo'
    });
  }, [usuario, reset]);

  // ==========================================
  // CANCELAR
  // ==========================================

  const handleExit = () => {
    navigate('/dashboard/admin/usuarios');
  };

  // ==========================================
  // ACTUALIZAR USUARIO
  // ==========================================

  const onSubmit = async (data) => {
    if (!usuario) return;

    if (!usernameGenerado) {
      toast.error('No se pudo generar el nombre de usuario');
      return;
    }

    setEnviando(true);

    try {
      const payload = {
        nombre: data.nombre.trim(),
        cedula: data.cedula.trim(),
        email: data.email?.trim().toLowerCase() || null,
        rol: data.rol,
        estado: data.estado
      };

      // Solo enviar contraseña si se va a cambiar.
      if (data.password) {
        payload.password = data.password;
      }

      // No enviamos username.
      // El backend lo genera desde el nombre.
      const url = `${import.meta.env.VITE_BACKEND_URL}/api/users/usuarios/${usuario.id}`;

      const response = await fetchDataBackend(
        url,
        payload,
        'PUT',
        token
      );

      if (response?.msg === 'Usuario actualizado correctamente') {
        toast.success(response.msg, {
          autoClose: 2000,
          onClose: handleExit
        });
      } else {
        toast.error(
          response?.msg || 'No se pudo actualizar el usuario'
        );
      }
    } catch (error) {
      console.error('Error actualizando usuario:', error);

      toast.error(
        error?.response?.data?.msg ||
        'Error actualizando el usuario'
      );
    } finally {
      setEnviando(false);
    }
  };

  // ==========================================
  // PANTALLA DE CARGA
  // ==========================================

  if (loading) {
    return (
      <div className="min-h-screen bg-fondo p-8">
        <div className="mx-auto max-w-6xl rounded-3xl border border-borde bg-superficie p-16 text-center text-texto-muted">
          Cargando usuario...
        </div>
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="min-h-screen bg-fondo p-8">
        <ToastContainer />

        <div className="mx-auto max-w-6xl rounded-3xl border border-borde bg-superficie p-12 text-center">
          <p>No se encontró el usuario seleccionado.</p>

          <button
            type="button"
            onClick={handleExit}
            className="mt-6 rounded-3xl bg-principal px-6 py-3 text-inverso"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // INTERFAZ
  // ==========================================

  return (
    <div className="min-h-screen bg-fondo text-principal">
      <ToastContainer />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 space-y-2">
          <h1 className="text-4xl font-semibold text-principal">
            Editar usuario
          </h1>

          <p className="max-w-2xl text-texto-secundario">
            Actualiza los datos del usuario seleccionado.
          </p>
        </div>

        <div className="mb-8 rounded-4xl border border-borde bg-superficie p-6 shadow-sm shadow-borde/50">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="grid gap-6"
          >
            <div className="grid gap-6 md:grid-cols-2">

              {/* NOMBRE */}

              <div className="flex flex-col">
                <label className="mb-2 font-semibold text-principal">
                  Nombre *
                </label>

                <input
                  type="text"
                  placeholder="Apellidos y nombres"
                  className={inputClasses}
                  {...register('nombre', {
                    validate: validateNombre
                  })}
                />

                {errors.nombre && (
                  <p className="mt-2 text-sm text-error">
                    {errors.nombre.message}
                  </p>
                )}
              </div>

              {/* CÉDULA */}

              <div className="flex flex-col">
                <label className="mb-2 font-semibold text-principal">
                  Cédula *
                </label>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Ej: 1234567890"
                  className={inputClasses}
                  {...register('cedula', {
                    validate: validateCedula
                  })}
                />

                {errors.cedula && (
                  <p className="mt-2 text-sm text-error">
                    {errors.cedula.message}
                  </p>
                )}
              </div>

              {/* USERNAME */}

              <div className="flex flex-col">
                <label className="mb-2 font-semibold text-principal">
                  Nombre de usuario *
                </label>

                <input
                  type="text"
                  placeholder="Se genera automáticamente"
                  value={usernameMostrado || ''}
                  readOnly
                  className="rounded-3xl border border-borde bg-superficie-muted px-4 py-3 font-semibold text-principal outline-none placeholder:font-normal placeholder:text-texto-muted"
                />

                <p className="mt-2 text-xs text-texto-muted">
                  Se genera con la primera letra del primer nombre
                  y el primer apellido, en mayúsculas.
                </p>
              </div>

              {/* CORREO OPCIONAL */}

              <div className="flex flex-col">
                <label className="mb-2 font-semibold text-principal">
                  Correo electrónico (opcional)
                </label>

                <input
                  type="email"
                  placeholder="usuario@farbiopharma.com"
                  className={inputClasses}
                  {...register('email', {
                    validate: validateEmail
                  })}
                />

                {errors.email && (
                  <p className="mt-2 text-sm text-error">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* ROL */}

              <div className="flex flex-col">
                <label className="mb-2 font-semibold text-principal">
                  Rol *
                </label>

                <select
                  className={inputClasses}
                  {...register('rol', {
                    required: 'El rol es obligatorio'
                  })}
                >
                  <option value="administrador">
                    Administrador
                  </option>
                  <option value="jefe">Jefe</option>
                  <option value="solicitante">
                    Solicitante
                  </option>
                  <option value="supervisor">
                    Supervisor
                  </option>
                  <option value="subgerentegeneral">
                    Subgerente General
                  </option>
                  <option value="gerentegeneral">
                    Gerente General
                  </option>
                  <option value="gerente">Gerente</option>
                  <option value="subgerente">
                    Subgerente
                  </option>
                  <option value="presidente">
                    Presidente
                  </option>
                  <option value="talento humano">
                    Talento Humano
                  </option>
                </select>

                {errors.rol && (
                  <p className="mt-2 text-sm text-error">
                    {errors.rol.message}
                  </p>
                )}
              </div>

              {/* CONTRASEÑA */}

              <div className="flex flex-col">
                <label className="mb-2 font-semibold text-principal">
                  Contraseña (opcional)
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Dejar vacío para conservar la actual"
                    autoComplete="new-password"
                    className={`${inputClasses} pr-12`}
                    {...register('password', {
                      validate: validatePassword
                    })}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(prev => !prev)
                    }
                    aria-label={
                      showPassword
                        ? 'Ocultar contraseña'
                        : 'Mostrar contraseña'
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-texto-muted hover:text-principal"
                  >
                    {showPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="3" />
                        <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8z" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17.94 17.94A10.05 10.05 0 0112 20c-6 0-10-8-10-8a18.92 18.92 0 014.05-5.48" />
                        <path d="M1 1l22 22" />
                        <path d="M9.88 9.88a3 3 0 014.24 4.24" />
                      </svg>
                    )}
                  </button>
                </div>

                {errors.password && (
                  <p className="mt-2 text-sm text-error">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* ESTADO */}

              <div className="flex flex-col">
                <label className="mb-2 font-semibold text-principal">
                  Estado *
                </label>

                <select
                  className={inputClasses}
                  {...register('estado', {
                    required: 'El estado es obligatorio'
                  })}
                >
                  <option value="activo">Activo</option>
                  <option value="bloqueado">Bloqueado</option>
                </select>

                {errors.estado && (
                  <p className="mt-2 text-sm text-error">
                    {errors.estado.message}
                  </p>
                )}
              </div>

            </div>

            {/* BOTONES */}

            <div className="mt-4 flex flex-wrap justify-end gap-4">
              <button
                type="button"
                onClick={handleExit}
                className="rounded-3xl border border-borde-fuerte bg-superficie px-6 py-3 text-sm font-semibold text-texto-secundario transition hover:bg-fondo"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={enviando || isValidating}
                className="rounded-3xl bg-principal px-6 py-3 text-sm font-semibold text-inverso transition hover:bg-principal-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {enviando
                  ? 'Actualizando...'
                  : isValidating
                    ? 'Validando...'
                    : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditarUsuario;
