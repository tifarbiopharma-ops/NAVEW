

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import {
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  UserRound,
} from 'lucide-react';
import axios from 'axios';
import storeAuth from '../../context/storeAuth';

// ==========================================
// VALORES INICIALES
// ==========================================

const DEFAULT_VALUES = {
  username: '',
  password: '',
};

// ==========================================
// ESTILOS
// ==========================================

const inputClasses =
  'w-full rounded-xl border border-slate-200 bg-[#edf3fc] px-4 py-3.5 text-sm text-[#17243D] shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#3d5a80] focus:ring-4 focus:ring-[#3d5a80]/10';

const submitButtonClasses =
  'mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#3d5a80] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#324b6b] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50';

// ==========================================
// COMPONENTE LOGIN
// ==========================================

const Login = () => {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { setToken } = storeAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: DEFAULT_VALUES,
  });

  // ==========================================
  // INICIAR SESIÓN
  // ==========================================

  const loginUser = async (data) => {
    setIsLoading(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/users/login`,
        {
          username: data.username.trim().toUpperCase(),
          password: data.password,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const { token, msg } = response.data || {};

      if (token) {
        // Guardar token en Zustand
        setToken(token);

        // Mostrar mensaje del backend
        if (msg) {
          toast.success(msg);
        }

        // Redirigir al Dashboard
        navigate('/dashboard');
      } else {
        toast.error(
          'No se recibió el token de autenticación'
        );
      }
    } catch (error) {
      const backendMsg =
        error?.response?.data?.msg ||
        'No se pudo iniciar sesión';

      toast.error(backendMsg);

      console.error('Error en login:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans lg:h-screen lg:flex-row lg:overflow-hidden">
      <ToastContainer />

      {/* ==========================================
          PANEL IZQUIERDO - IMAGEN NAVEW
      ========================================== */}

      <div className="relative hidden min-h-screen overflow-hidden bg-[#eef5fc] lg:block lg:w-[63%]">

        <img
          src="/fondo-login.jpg"
          alt="NAVEW - Transporte, paquetería y servicios externos"
          className="absolute inset-0 h-full w-full object-cover object-left"
        />

        {/* CAPA SOBRE LA IMAGEN */}

        <div className="absolute inset-0 bg-[#17243D]/10" />

        {/* FRASE INFERIOR */}

        <div className="absolute bottom-10 left-10 max-w-sm text-white xl:bottom-12 xl:left-12">

          <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-white/70">
            NAVEW
          </p>

          <p className="text-2xl leading-tight xl:text-3xl">
            Gestión simple para cada proceso.
          </p>

        </div>
      </div>

      {/* ==========================================
          PANEL DERECHO - LOGIN
      ========================================== */}

      <div className="flex min-h-screen w-full flex-col bg-white lg:min-h-0 lg:w-[37%] lg:overflow-y-auto">

        {/* ======================================
            CONTENIDO CENTRAL
        ====================================== */}

        <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 sm:px-10 lg:py-10">

          <div className="w-full max-w-[360px]">

            {/* ==================================
                ENCABEZADO
            ================================== */}

            <div className="mb-7 text-center">
              <h1 className="text-3xl font-semibold tracking-tight text-[#17243D]">
                Iniciar sesión
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Accede a tu cuenta para continuar
              </p>

            </div>

            {/* ==================================
                FORMULARIO LOGIN
            ================================== */}

            <form
              className="flex w-full flex-col gap-4"
              onSubmit={handleSubmit(loginUser)}
            >

              {/* ==================================
                  NOMBRE DE USUARIO
              ================================== */}

              <div className="w-full">

                <div className="relative">

                  <UserRound
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6e83a0]"
                  />

                  <input
                    type="text"
                    placeholder="Nombre de usuario"
                    autoComplete="username"
                    maxLength={100}
                    className={`${inputClasses} pl-11`}
                    {...register('username', {
                      required:
                        'El nombre de usuario es obligatorio',
                      validate: (value) =>
                        value.trim().length > 0 ||
                        'El nombre de usuario es obligatorio',
                    })}
                  />

                </div>

                {errors.username && (
                  <p className="ml-1 mt-1.5 text-xs text-red-600">
                    {errors.username.message}
                  </p>
                )}

              </div>

              {/* ==================================
                  CONTRASEÑA
              ================================== */}

              <div className="w-full">

                <div className="relative">

                  <LockKeyhole
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6e83a0]"
                  />

                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Contraseña"
                    autoComplete="current-password"
                    className={`${inputClasses} pl-11 pr-12`}
                    {...register('password', {
                      required:
                        'La contraseña es obligatoria',
                      minLength: {
                        value: 14,
                        message:
                          'La contraseña debe tener mínimo 14 caracteres',
                      },
                    })}
                  />

                  {/* MOSTRAR / OCULTAR CONTRASEÑA */}

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((current) => !current)
                    }
                    aria-label={
                      showPassword
                        ? 'Ocultar contraseña'
                        : 'Mostrar contraseña'
                    }
                    className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-lg p-2 text-[#64748b] transition hover:bg-slate-200 hover:text-[#17243D]"
                  >
                    {showPassword ? (
                      <Eye size={19} />
                    ) : (
                      <EyeOff size={19} />
                    )}
                  </button>

                </div>

                {errors.password && (
                  <p className="ml-1 mt-1.5 text-xs text-red-600">
                    {errors.password.message}
                  </p>
                )}

              </div>

              {/* ==================================
                  BOTÓN INICIAR SESIÓN
              ================================== */}

              <button
                type="submit"
                disabled={isLoading}
                className={submitButtonClasses}
              >
                {isLoading ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                    Iniciando...
                  </>
                ) : (
                  'Iniciar sesión'
                )}
              </button>

            </form>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
