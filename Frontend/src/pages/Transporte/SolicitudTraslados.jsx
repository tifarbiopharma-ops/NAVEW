
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  CheckCircle2,
  LoaderCircle,
  Car,
  Bus,
  BadgeDollarSign,
  ClipboardList,
} from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import storeAuth from '../../context/storeAuth';
import { getAuthClaims } from '../../utils/authClaims';

const API = import.meta.env.VITE_BACKEND_URL;

const obtenerFechaLocal = () => {
  const ahora = new Date();
  const offset = ahora.getTimezoneOffset() * 60000;

  return new Date(ahora.getTime() - offset)
    .toISOString()
    .slice(0, 10);
};

const obtenerHoraLocal = () =>
  new Date().toLocaleTimeString('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const obtenerValoresIniciales = (ubicacionOrigenId = '') => ({
  fecha_salida: obtenerFechaLocal(),
  hora_salida: obtenerHoraLocal(),
  hora_llegada: '',
  id_planta_origen: ubicacionOrigenId,
  id_planta_destino: '',
  motivo_viaje: '',
  id_chofer: '',
  monto_solicitado: '',
});

const SolicitudTraslados = () => {
  const token = storeAuth((state) => state.token);
  const claims = getAuthClaims(token);
  const role = (claims?.rol || '').toLowerCase();

  const [isGenerating, setIsGenerating] = useState(false);
  const [tabIndex, setTabIndex] = useState('EMPRESARIAL');

  const [choferes, setChoferes] = useState([]);
  const [plantas, setPlantas] = useState([]);
  const [ubicacionOrigenId, setUbicacionOrigenId] = useState('');

  const [loadingChoferes, setLoadingChoferes] = useState(true);
  const [loadingPlantas, setLoadingPlantas] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: obtenerValoresIniciales(),
    shouldUnregister: true,
  });

  const form = watch();

  const canCreate =
    role.includes('solicitante') ||
    role.includes('administrador') ||
    role.includes('jefe') ||
    role.includes('subgerente') ||
    role.includes('gerente') ||
    role.includes('subgerentegeneral') ||
    role.includes('gerentegeneral') ||
    role.includes('presidente');
    

  useEffect(() => {
    if (!token || !canCreate) return;

    let activo = true;
    const controller = new AbortController();

    const cargarChoferes = async () => {
      setLoadingChoferes(true);

      try {
        const response = await fetch(
          `${API}/api/traslados/choferes`,
          {
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data?.msg || 'No se pudieron cargar los choferes'
          );
        }

        if (!activo) return;

        setChoferes(data.choferes || []);
      } catch (error) {
        if (activo) {
          toast.error(error.message || 'No se pudieron cargar los choferes');
        }
      } finally {
        if (activo) setLoadingChoferes(false);
      }
    };

    const cargarPlantas = async () => {
      setLoadingPlantas(true);

      try {
        const plantasResponse = await fetch(
          `${API}/api/traslados/plantas`,
          {
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const plantasData = await plantasResponse.json().catch(() => ({}));

        if (!plantasResponse.ok) {
          throw new Error(
            plantasData?.msg || 'No se pudieron cargar las plantas'
          );
        }

        if (!activo) return;

        const plantasDisponibles = plantasData.plantas || [];

        const origenId = String(
          plantasData.ubicacionOrigenId ?? ''
        );

        const existeUbicacion = plantasDisponibles.some(
          (planta) => String(planta.id) === origenId
        );

        const origenValido = existeUbicacion ? origenId : '';

        setPlantas(plantasDisponibles);
        setUbicacionOrigenId(origenValido);

        setValue('id_planta_origen', origenValido, {
          shouldValidate: false,
          shouldDirty: false,
        });

      } catch (error) {
        if (activo) {
          toast.error(
            error.message || 'No se pudieron cargar las plantas'
          );
        }
      } finally {
        if (activo) setLoadingPlantas(false);
      }
    };

    cargarChoferes();
    cargarPlantas();

    return () => {
      activo = false;
      controller.abort();
    };
  }, [token, canCreate, setValue]);

  


const onSubmit = async (formData) => {
  if (!token) {
    toast.error('No tienes una sesión activa');
    return;
  }

  if (
    String(formData.id_planta_origen) ===
    String(formData.id_planta_destino)
  ) {
    toast.error('La planta de origen y destino deben ser diferentes');
    return;
  }

  const endpoints = {
    EMPRESARIAL: '/api/traslados/empresarial',
    PERSONAL: '/api/traslados/personal',
    PRIVADO: '/api/traslados/privado',
  };

  const endpoint = endpoints[tabIndex];

  if (!endpoint) {
    toast.error('Tipo de transporte no válido');
    return;
  }

  setIsGenerating(true);

  try {
    const response = await fetch(`${API}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    });

    // Recibir la respuesta del backend
    const data = await response.json();

    // Obtener el mensaje enviado en res.status().json({ msg })
    const mensajeBackend = data?.msg;

    console.log('Respuesta del backend:', {
      status: response.status,
      msg: mensajeBackend,
      data,
    });

    // Mostrar el mensaje de error del backend
    if (!response.ok || data?.success === false) {
      toast.error(
        mensajeBackend || 'El servidor no envió un mensaje de error',
        {
          autoClose: 6000,
        }
      );
      return;
    }

    // Mostrar el mensaje de éxito del backend
    toast.success(
      mensajeBackend || 'Solicitud registrada correctamente',
      {
        autoClose: 4000,
      }
    );

    // Limpiar formulario conservando la ubicación de origen
    reset(obtenerValoresIniciales(ubicacionOrigenId));

  } catch (error) {
    console.error('Error al procesar la respuesta:', error);

    toast.error(
      'No se pudo obtener una respuesta válida del servidor'
    );
  } finally {
    setIsGenerating(false);
  }
};



  return (
    <div className="min-h-screen bg-fondo p-4 md:p-8">
      <ToastContainer position="top-right" autoClose={4000} />

      <div className="mx-auto max-w-7xl space-y-1">
        {canCreate && (
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-principal md:text-3xl">
              Solicitud de Transporte
            </h1>

            <p className="mt-1 text-sm text-texto-muted">
              Registra una nueva solicitud de transporte para su respectiva gestión.
            </p>
          </div>
        )}

        {canCreate && (
          <div className="rounded-3xl border border-borde bg-superficie p-6 shadow-sm md:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-principal p-2.5 text-inverso">
                <ClipboardList size={19} />
              </div>

              <h2 className="text-lg font-bold text-principal">
                Datos de la solicitud
              </h2>
            </div>

            <div className="mb-6 flex flex-wrap gap-3">
              {[
                {
                  id: 'EMPRESARIAL',
                  label: 'Empresarial',
                  icon: Car,
                },
                {
                  id: 'PRIVADO',
                  label: 'Privado',
                  icon: Bus,
                },
                {
                  id: 'PERSONAL',
                  label: 'Personal',
                  icon: BadgeDollarSign,
                },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTabIndex(id)}
                  className={`flex min-w-32 items-center justify-center gap-2 rounded-md border px-5 py-2.5 text-xs font-bold transition ${
                    tabIndex === id
                      ? 'border-principal bg-principal text-inverso shadow-sm'
                      : 'border-borde bg-superficie text-acento hover:border-borde-fuerte'
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="grid gap-x-7 gap-y-4 md:grid-cols-2"
            >
              {/* FECHA DE SALIDA */}
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-principal">
                  Fecha de salida
                </span>

                <input
                  type="date"
                  {...register('fecha_salida', {
                    required: 'La fecha de salida es obligatoria',
                  })}
                  className="w-full rounded-md border border-borde bg-fondo px-3 py-2.5 text-sm outline-none focus:border-acento"
                />

                {errors.fecha_salida && (
                  <span className="text-xs text-error">
                    {errors.fecha_salida.message}
                  </span>
                )}
              </label>

              {/* CHOFER */}
              {tabIndex === 'EMPRESARIAL' && (
                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-principal">
                    Chofer
                  </span>

                  <select
                    {...register('id_chofer', {
                      required: 'El chofer es obligatorio',
                    })}
                    value={form.id_chofer ?? ''}
                    disabled={loadingChoferes}
                    className="w-full rounded-md border border-borde bg-fondo px-3 py-2.5 text-sm outline-none focus:border-acento"
                  >
                    <option key={loadingChoferes ? 'cargando' : 'listo'} value="" disabled>
                      {loadingChoferes
                        ? 'Cargando choferes...'
                        : 'Seleccione un chofer'}
                    </option>

                    {choferes.map((chofer) => (
                      <option key={chofer.id} value={chofer.id}>
                        {chofer.nombre}
                      </option>
                    ))}
                  </select>

                  {errors.id_chofer && (
                    <span className="text-xs text-error">
                      {errors.id_chofer.message}
                    </span>
                  )}
                </label>
              )}

              {/* HORA DE SALIDA */}
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-principal">
                  Hora de salida
                </span>

                <input
                  type="time"
                  {...register('hora_salida', {
                    required: 'La hora de salida es obligatoria',
                  })}
                  className="w-full rounded-md border border-borde bg-fondo px-3 py-2.5 text-sm outline-none focus:border-acento"
                />

                {errors.hora_salida && (
                  <span className="text-xs text-error">
                    {errors.hora_salida.message}
                  </span>
                )}
              </label>

              {/* El KM inicial no se pide aquí: lo registra garita al escanear la salida. */}

              {/* PLANTA DE ORIGEN */}
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-principal">
                  Planta de origen
                </span>

                <select
                  {...register('id_planta_origen', {
                    required: 'La planta de origen es obligatoria',
                  })}
                  value={form.id_planta_origen ?? ''}
                  onChange={(event) => {
                    setValue(
                      'id_planta_origen',
                      event.target.value,
                      {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true,
                      }
                    );
                  }}
                  disabled={loadingPlantas}
                  className="w-full rounded-md border border-borde bg-fondo px-3 py-2.5 text-sm outline-none focus:border-acento"
                >
                  <option key={loadingPlantas ? 'cargando' : 'listo'} value="" disabled>
                    {loadingPlantas
                      ? 'Cargando plantas...'
                      : 'Seleccione una planta'}
                  </option>

                  {plantas.map((planta) => (
                    <option
                      key={planta.id}
                      value={String(planta.id)}
                      disabled={
                        String(planta.id) ===
                        String(form.id_planta_destino)
                      }
                    >
                      {planta.nombre}
                    </option>
                  ))}
                </select>

                {errors.id_planta_origen && (
                  <span className="text-xs text-error">
                    {errors.id_planta_origen.message}
                  </span>
                )}
              </label>

              {/* PLANTA DE DESTINO */}
              <label className="space-y-1.5">
                <span className="text-xs font-bold text-principal">
                  Planta de destino
                </span>

                <select
                  {...register('id_planta_destino', {
                    required: 'La planta de destino es obligatoria',
                  })}
                  value={form.id_planta_destino ?? ''}
                  disabled={loadingPlantas}
                  className="w-full rounded-md border border-borde bg-fondo px-3 py-2.5 text-sm outline-none focus:border-acento"
                >
                  <option key={loadingPlantas ? 'cargando' : 'listo'} value="" disabled>
                    {loadingPlantas
                      ? 'Cargando plantas...'
                      : 'Seleccione una planta de destino'}
                  </option>

                  {plantas.map((planta) => (
                    <option
                      key={planta.id}
                      value={String(planta.id)}
                      disabled={
                        String(planta.id) ===
                        String(form.id_planta_origen)
                      }
                    >
                      {planta.nombre}
                    </option>
                  ))}
                </select>

                {errors.id_planta_destino && (
                  <span className="text-xs text-error">
                    {errors.id_planta_destino.message}
                  </span>
                )}
              </label>

              {/* MOTIVO */}
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-xs font-bold text-principal">
                  Motivo
                </span>

                <textarea
                  {...register('motivo_viaje', {
                    required: 'El motivo es obligatorio',
                    validate: (value) =>
                      value.trim() !== '' ||
                      'El motivo es obligatorio',
                  })}
                  rows={2}
                  placeholder="Ingrese el motivo de la salida..."
                  className="w-full resize-none rounded-md border border-borde bg-fondo px-3 py-2.5 text-sm outline-none placeholder:text-texto-muted focus:border-acento"
                />

                {errors.motivo_viaje && (
                  <span className="text-xs text-error">
                    {errors.motivo_viaje.message}
                  </span>
                )}
              </label>

              {/* MONTO */}
              {(tabIndex === 'PERSONAL' ||
                tabIndex === 'PRIVADO') && (
                <label className="space-y-1.5">
                  <span className="text-xs font-bold text-principal">
                    Monto $
                  </span>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    {...register('monto_solicitado', {
                      required: 'El monto es obligatorio',
                      min: {
                        value: 0.01,
                        message:
                          'El monto debe ser mayor que cero',
                      },
                      valueAsNumber: true,
                    })}
                    placeholder="$1.50"
                    className="w-full rounded-md border border-borde bg-fondo px-3 py-2.5 text-sm outline-none placeholder:text-texto-muted focus:border-acento"
                  />

                  {errors.monto_solicitado && (
                    <span className="text-xs text-error">
                      {errors.monto_solicitado.message}
                    </span>
                  )}
                </label>
              )}

              {/* GUARDAR SOLICITUD */}
              <div className="pt-2 md:col-span-2">
                <button
                  type="submit"
                  disabled={isGenerating}
                  aria-busy={isGenerating}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-principal px-5 py-2.5 text-xs font-bold text-inverso shadow-sm transition hover:bg-principal-hover disabled:opacity-60"
                >
                  <span className="inline-flex shrink-0" aria-hidden="true" translate="no">
                    <LoaderCircle
                      className={isGenerating ? 'animate-spin' : 'hidden'}
                      size={16}
                    />
                    <CheckCircle2 className={isGenerating ? 'hidden' : ''} size={16} />
                  </span>

                  <span>Guardar solicitud</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default SolicitudTraslados;
