import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ToastContainer } from 'react-toastify';
import { toast } from 'react-toastify';
import axios from 'axios';
import storeAuth from '../../context/storeAuth';

const VALID_EMAIL_REGEX = /^[^@]+@(farbiopharma\.com|inpel\.com)$/;
const DEFAULT_VALUES = { email: '', password: '' };

const inputClasses = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#17243D] shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#3d5a80] focus:ring-4 focus:ring-[#3d5a80]/10';
const iconButtonClasses = 'absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded-lg border-none bg-transparent p-2 text-slate-500 transition hover:bg-slate-100 hover:text-[#3d5a80] flex items-center justify-center';
const submitButtonClasses = 'mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#3d5a80] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#324b6b] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50';

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { setToken } = storeAuth();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({ defaultValues: DEFAULT_VALUES });

  const loginUser = async (data) => {
    setIsLoading(true);

    try {
      const url = `${import.meta.env.VITE_BACKEND_URL}/api/users/login`;
      const response = await axios.post(url, data, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const { token, msg } = response.data || {};

      if (msg) {
        toast.success(msg);
      }

      if (token) {
        setToken(token);
        navigate('/dashboard');
      }
    } catch (error) {
      const backendMsg = error?.response?.data?.msg || 'No se pudo iniciar sesión';
      toast.error(backendMsg);
      console.error('Error en login:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Gowun+Batang&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);

    return () => {
      document.head.removeChild(fontLink);
    };
  }, []);

  return (
    
    <div className="flex min-h-screen flex-col overflow-hidden bg-white sm:flex-row" style={{ fontFamily: 'Gowun Batang, serif' }}>
      <ToastContainer />

      <div className="relative hidden min-h-screen overflow-hidden bg-[#eef5fc] sm:block sm:w-1/2 lg:w-7/12">
        <img
          src="/fondo-login.jpg"
          alt="Laboratorio Farbiopharma"
          className="absolute inset-0 h-full w-full object-cover object-left"
        />
        <div className="absolute inset-0 bg-[#17243D]/20" />
        <div className="absolute bottom-12 left-12 max-w-sm text-white">
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-white/70">Navew</p>
          <p className="text-3xl leading-tight">Gestión simple para cada proceso.</p>
        </div>
      </div>

      <div className="flex w-full items-start justify-center overflow-y-auto bg-white px-5 py-10 sm:w-1/2 sm:py-16 lg:w-5/12 lg:py-20">
        <div className="w-full max-w-md">
          <div className="-mb-20 flex items-center justify-center">
            <img src="/logo.png" alt="logo" className="h-80 w-80 object-contain" />
          </div>

          <div className="mb-8 text-center">
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-[#17243D]">Bienvenido</p>
            <h1 className="text-3xl font-semibold text-[#17243D]">Iniciar sesión</h1>
            <p className="mt-2 text-sm text-slate-700">Accede a tu cuenta para continuar</p>
          </div>

          <form className="flex w-full flex-col gap-6" onSubmit={handleSubmit(loginUser)}>
            <div className="flex flex-col w-full min-w-0">
              <input
                type="email"
                placeholder="Email"
                className={inputClasses}
                {...register('email', {
                  required: 'El email es obligatorio',
                  pattern: {
                    value: VALID_EMAIL_REGEX,
                    message: 'Debes usar email @farbiopharma.com o @inpel.com'
                  }
                })}
              />
              {errors.email && <p className="ml-1 mt-1 text-sm text-red-800">{errors.email.message}</p>}
            </div>

            <div className="relative flex flex-col w-full min-w-0">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Contraseña"
                className={`${inputClasses} pr-10`}
                {...register('password', {
                  required: 'La contraseña es obligatoria',
                  minLength: {
                    value: 14,
                    message: 'La contraseña debe tener mínimo 14 caracteres'
                  }
                })}
              />

              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className={iconButtonClasses}
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

              {errors.password && <p className="ml-1 mt-1 text-sm text-red-800">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isLoading} className={submitButtonClasses}>
              {isLoading ? 'Iniciando...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
