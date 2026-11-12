
import { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import storeAuth from '../../../context/storeAuth';
import useFetch from '../../../hooks/useFetch';

// ==========================================
// GENERAR USERNAME PARA MOSTRAR EN PANTALLA
// Formato: PEREZ LOPEZ JUAN CARLOS -> JPEREZ
// ==========================================

const generarUsername = (nombreCompleto) => {
  const partes = String(nombreCompleto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean);

  if (partes.length < 3) {
    return '';
  }

  const primerApellido = partes[0];
  const primerNombre = partes[2];

  return `${primerNombre.charAt(0)}${primerApellido}`;
};

const CrearUsuarioPage = () => {
  const navigate = useNavigate();

  const { token } = storeAuth();
  const { fetchDataBackend } = useFetch();

  const [enviando, setEnviando] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [buscandoColaborador, setBuscandoColaborador] = useState(false);
  const [colaboradorEncontrado, setColaboradorEncontrado] = useState(false);

  // ==========================================
  // VALIDAR NOMBRE
  // ==========================================

  const validateNombre = useCallback((value) => {
    if (!value || !value.trim()) {
      return 'El nombre es obligatorio';
    }

    const trimmed = value.trim();

    if (/\d/.test(trimmed)) {
      return 'El nombre no puede contener números';
    }

    if (trimmed.length < 2) {
      return 'El nombre debe tener mínimo 2 caracteres';
    }

    if (trimmed.length > 130) {
      return 'El nombre debe tener máximo 130 caracteres';
    }

    const palabras = trimmed.split(/\s+/);

    if (palabras.length < 3) {
      return 'Debe contener dos apellidos y al menos un nombre';
    }

    for (const palabra of palabras) {
      if (palabra.length < 2) {
        return 'Cada palabra debe tener mínimo 2 caracteres';
      }

      if (palabra.length > 30) {
        return 'Cada palabra debe tener máximo 30 caracteres';
      }
    }

    return true;
  }, []);

  // ==========================================
  // VALIDAR CÉDULA
  // ==========================================

  const validateCedula = useCallback(
    async (value) => {
      if (!value || !value.trim()) {
        return 'La cédula es obligatoria';
      }

      const cedula = value.trim();

      if (!/^\d{10}$/.test(cedula)) {
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

        if (
          response?.usuarios &&
          Array.isArray(response.usuarios)
        ) {
          const existe = response.usuarios.some(
            (u) => String(u.cedula).trim() === cedula
          );

          if (existe) {
            return 'Esta cédula ya tiene un usuario registrado';
          }
        }
      } catch (error) {
        console.error('Error verificando cédula:', error);
      }

      return true;
    },
    [fetchDataBackend, token]
  );

  // ==========================================
  // VALIDAR CORREO OPCIONAL
  // ==========================================

  const validateEmail = useCallback(
    async (value) => {
      if (!value || !value.trim()) {
        return true;
      }

      const email = value.trim().toLowerCase();

      if (email.length > 70) {
        return 'El email debe tener máximo 70 caracteres';
      }

      const dominios = [
        '@farbiopharma.com',
        '@inpel.com',
        '@clarel.com'
      ];

      if (!dominios.some((dominio) => email.endsWith(dominio))) {
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
            (u) => u.email?.toLowerCase() === email
          );

          if (existe) {
            return 'Este correo ya está registrado';
          }
        }
      } catch (error) {
        console.error('Error verificando email:', error);
      }

      return true;
    },
    [fetchDataBackend, token]
  );

  // ==========================================
  // VALIDAR CONTRASEÑA
  // ==========================================

  const validatePassword = useCallback((value) => {
    if (!value) {
      return 'La contraseña es obligatoria';
    }

    if (value.length < 14) {
      return 'La contraseña debe tener mínimo 14 caracteres';
    }

    if (value.length > 20) {
      return 'La contraseña debe tener máximo 20 caracteres';
    }

    return true;
  }, []);

  // ==========================================
  // FORMULARIO
  // ==========================================

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValidating },
    reset
  } = useForm({
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      nombre: '',
      cedula: '',
      username: '',
      email: '',
      password: '',
      rol: 'solicitante'
    }
  });

  const cedulaActual = watch('cedula');
  const usernameActual = watch('username');

  // ==========================================
  // BUSCAR COLABORADOR POR CÉDULA
  // ==========================================

  useEffect(() => {
    const cedula = cedulaActual?.trim() || '';

    if (!/^\d{10}$/.test(cedula)) {
      setColaboradorEncontrado(false);
      setBuscandoColaborador(false);

      setValue('nombre', '');
      setValue('username', '');
      setValue('email', '');

      return undefined;
    }

    let activo = true;

    const buscarColaborador = async () => {
      setBuscandoColaborador(true);
      setColaboradorEncontrado(false);

      try {
        const url = `${import.meta.env.VITE_BACKEND_URL}/api/users/colaboradores/cedula/${cedula}`;

        const response = await fetchDataBackend(
          url,
          null,
          'GET',
          token
        );

        if (!activo) return;

        if (response?.colaborador) {
          const colaborador = response.colaborador;

          const nombre = colaborador.NOMBRE || '';

          const username = generarUsername(nombre);

          setValue('nombre', nombre, {
            shouldValidate: true
          });

          setValue('username', username, {
            shouldValidate: true
          });

          setValue(
            'email',
            colaborador.email ||
              colaborador.EMAIL_CORPORATIVO ||
              '',
            { shouldValidate: true }
          );

          setColaboradorEncontrado(true);
        } else {
          setValue('nombre', '');
          setValue('username', '');
          setValue('email', '');

          setColaboradorEncontrado(false);
        }
      } catch (error) {
        if (!activo) return;

        console.error('Error buscando colaborador:', error);

        setValue('nombre', '');
        setValue('username', '');
        setValue('email', '');

        setColaboradorEncontrado(false);
      } finally {
        if (activo) {
          setBuscandoColaborador(false);
        }
      }
    };

    buscarColaborador();

    return () => {
      activo = false;
    };
  }, [cedulaActual, fetchDataBackend, setValue, token]);

  // ==========================================
  // CANCELAR
  // ==========================================

  const handleExit = () => {
    navigate('/dashboard/admin/usuarios');
  };

  // ==========================================
  // CREAR USUARIO
  // ==========================================

  const onSubmit = async (data) => {
    if (!colaboradorEncontrado) {
      toast.error('Primero debes seleccionar un colaborador válido');
      return;
    }

    if (!data.username) {
      toast.error('No se pudo generar el nombre de usuario');
      return;
    }

    setEnviando(true);

    try {
      const url = `${import.meta.env.VITE_BACKEND_URL}/api/users/registro`;

      // El backend genera el username desde
      // Colaboradores.NOMBRE, no desde este formulario.
      const datosUsuario = {
        cedula: data.cedula.trim(),
        email: data.email?.trim().toLowerCase() || null,
        password: data.password,
        rol: data.rol
      };

      const response = await fetchDataBackend(
        url,
        datosUsuario,
        'POST',
        token
      );

      if (response?.usuario) {
        toast.success(
          `Usuario ${response.usuario.username} creado correctamente`,
          {
            onClose: () => {
              reset();
              handleExit();
            },
            autoClose: 2000
          }
        );
      } else {
        toast.error(
          response?.msg || 'No se pudo crear el usuario'
        );
      }
    } catch (error) {
      console.error('Error creando usuario:', error);

      toast.error(
        error?.response?.data?.msg ||
          'Error creando el usuario'
      );
    } finally {
      setEnviando(false);
    }
  };

  // ==========================================
  // INTERFAZ
  // ==========================================

  return (
    <div className="min-h-screen bg-fondo text-principal">
      <ToastContainer />

      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">

        <div className="space-y-4 mb-6">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.22em] text-texto-muted">
              Administración de usuarios
            </p>

            <h1 className="text-4xl font-semibold text-principal">
              Crear nuevo usuario
            </h1>

            <p className="max-w-2xl text-texto-secundario">
              Registra un nuevo usuario para que pueda acceder al sistema.
            </p>
          </div>
        </div>

        <div className="rounded-4xl border border-borde bg-superficie p-6 shadow-sm shadow-borde/50">

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="grid gap-6"
          >
            <div className="grid gap-6 md:grid-cols-2">

              {/* NOMBRE */}

              <div className="flex flex-col">
                <label className="text-principal font-semibold mb-2">
                  Nombre *
                </label>

                <input
                  type="text"
                  placeholder="Apellidos y nombres del colaborador"
                  className={`rounded-3xl border px-4 py-3 text-principal outline-none transition focus:ring-2 ${
                    errors.nombre
                      ? 'border-error-borde bg-error-fondo focus:border-error-borde focus:ring-error-fondo'
                      : 'border-borde bg-fondo focus:border-acento focus:ring-suave'
                  }`}
                  {...register('nombre', {
                    validate: validateNombre
                  })}
                  readOnly
                  title="Nombre obtenido del registro de colaboradores"
                />

                {errors.nombre && (
                  <p className="text-error text-sm mt-2 font-medium">
                    {errors.nombre.message}
                  </p>
                )}

                {buscandoColaborador && (
                  <p className="mt-2 text-xs text-texto-muted">
                    Buscando colaborador...
                  </p>
                )}

                {!buscandoColaborador &&
                  cedulaActual?.length === 10 &&
                  !colaboradorEncontrado && (
                    <p className="mt-2 text-xs font-medium text-error">
                      No se encontró un colaborador con esa cédula.
                    </p>
                  )}
              </div>

              {/* CÉDULA */}

              <div className="flex flex-col">
                <label className="text-principal font-semibold mb-2">
                  Cédula *
                </label>

                <input
                  type="text"
                  placeholder="Ej: 1234567890"
                  inputMode="numeric"
                  maxLength={10}
                  className={`rounded-3xl border px-4 py-3 text-principal outline-none transition focus:ring-2 ${
                    errors.cedula
                      ? 'border-error-borde bg-error-fondo focus:border-error-borde focus:ring-error-fondo'
                      : 'border-borde bg-fondo focus:border-acento focus:ring-suave'
                  }`}
                  {...register('cedula', {
                    validate: validateCedula
                  })}
                />

                {errors.cedula && (
                  <p className="text-error text-sm mt-2 font-medium">
                    {errors.cedula.message}
                  </p>
                )}

                {isValidating && !errors.cedula && (
                  <p className="text-texto-muted text-xs mt-2">
                    Verificando cédula...
                  </p>
                )}
              </div>

              {/* USERNAME AUTOMÁTICO */}

              <div className="flex flex-col">
                <label className="text-principal font-semibold mb-2">
                  Nombre de usuario *
                </label>

                <input
                  type="text"
                  placeholder="Se genera automáticamente"
                  value={usernameActual || ''}
                  readOnly
                  className="rounded-3xl border border-borde bg-superficie-muted px-4 py-3 font-semibold text-principal outline-none placeholder:font-normal placeholder:text-texto-muted"
                />

                <p className="mt-2 text-xs text-texto-muted">
                  Se genera con la primera letra del primer nombre
                  y el primer apellido, en mayúsculas.
                </p>
              </div>

              {/* EMAIL OPCIONAL */}

              <div className="flex flex-col">
                <label className="text-principal font-semibold mb-2">
                  Correo electrónico (opcional)
                </label>

                <input
                  type="email"
                  placeholder="usuario@farbiopharma.com"
                  className={`rounded-3xl border px-4 py-3 text-principal outline-none transition focus:ring-2 ${
                    errors.email
                      ? 'border-error-borde bg-error-fondo focus:border-error-borde focus:ring-error-fondo'
                      : 'border-borde bg-fondo focus:border-acento focus:ring-suave'
                  }`}
                  {...register('email', {
                    validate: validateEmail
                  })}
                />

                {errors.email && (
                  <p className="text-error text-sm mt-2 font-medium">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* ROL */}

              <div className="flex flex-col">
                <label className="text-principal font-semibold mb-2">
                  Rol *
                </label>

                <select
                  className={`rounded-3xl border px-4 py-3 text-principal outline-none transition focus:ring-2 ${
                    errors.rol
                      ? 'border-error-borde bg-error-fondo focus:border-error-borde focus:ring-error-fondo'
                      : 'border-borde bg-fondo focus:border-acento focus:ring-suave'
                  }`}
                  {...register('rol', {
                    required: 'El rol es obligatorio'
                  })}
                >
                  <option value="">Selecciona un rol</option>
                  <option value="administrador">Administrador</option>
                  <option value="jefe">Jefe</option>
                  <option value="solicitante">Solicitante</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="subgerentegeneral">Subgerente General</option>
                  <option value="gerentegeneral">Gerente General</option>
                  <option value="gerente">Gerente</option>
                  <option value="subgerente">Subgerente</option>
                  <option value="talento humano">Talento Humano</option>
                </select>

                {errors.rol && (
                  <p className="text-error text-sm mt-2 font-medium">
                    {errors.rol.message}
                  </p>
                )}
              </div>

              {/* CONTRASEÑA */}

              <div className="flex flex-col">
                <label className="text-principal font-semibold mb-2">
                  Contraseña *
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••••"
                    autoComplete="new-password"
                    className={`w-full rounded-3xl border px-4 py-3 pr-12 text-principal outline-none transition focus:ring-2 ${
                      errors.password
                        ? 'border-error-borde bg-error-fondo focus:border-error-borde focus:ring-error-fondo'
                        : 'border-borde bg-fondo focus:border-acento focus:ring-suave'
                    }`}
                    {...register('password', {
                      validate: validatePassword
                    })}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((prev) => !prev)
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
                        <path d="M9.88 9.88a3 0 014.24 4.24" />
                      </svg>
                    )}
                  </button>
                </div>

                {errors.password && (
                  <p className="text-error text-sm mt-2 font-medium">
                    {errors.password.message}
                  </p>
                )}
              </div>
            </div>

            {/* BOTONES */}

            <div className="flex flex-wrap gap-4 justify-end mt-4">
              <button
                type="button"
                onClick={handleExit}
                className="rounded-3xl border border-borde-fuerte bg-superficie px-6 py-3 text-sm font-semibold text-texto-secundario transition hover:bg-fondo"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={
                  enviando ||
                  isValidating ||
                  buscandoColaborador ||
                  !colaboradorEncontrado
                }
                className="rounded-3xl bg-principal px-6 py-3 text-sm font-semibold text-inverso transition hover:bg-principal-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enviando
                  ? 'Creando...'
                  : isValidating
                    ? 'Validando...'
                    : 'Crear usuario'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default CrearUsuarioPage;
