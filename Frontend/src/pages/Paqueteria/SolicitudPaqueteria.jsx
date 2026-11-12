import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { LoaderCircle, Package, Send } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import storeAuth from '../../context/storeAuth';

const API = import.meta.env.VITE_BACKEND_URL;

const fechaLocal = () => {
  const fecha = new Date();
  const offset = fecha.getTimezoneOffset() * 60000;
  return new Date(fecha.getTime() - offset).toISOString().slice(0, 10);
};

const horaLocal = () => {
  const fecha = new Date();
  return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
};

const initialForm = {
  fecha_salida: fechaLocal(),
  hora_entrega: horaLocal(),
  id_planta_origen: '',
  id_area_origen: '',
  id_planta_destino: '',
  id_area_destino: '',
  id_destinatario: '',
  tipo_contenido: '',
  comentario: '',
};
const SolicitudPaqueteria = () => {
  const token = storeAuth((state) => state.token);
  const [perfilUsuario, setPerfilUsuario] = useState(null);
  

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({ defaultValues: initialForm });
  const form = watch();
  const [catalogos, setCatalogos] = useState({
  plantas: [],
  areas: [],
  colaboradores: [],
  usuarioActual: null
  });

  const idColaborador = Number(catalogos.usuarioActual?.idColaborador);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const responsableActual = catalogos.colaboradores.find(
    (item) => Number(item.id) === idColaborador
  );

  // UseEffect para cargar el perfil del usuario autenticado y establecerlo en el estado local.
  useEffect(() => {
    if (!token) {
      setPerfilUsuario(null);
      return;
    }
    const controller = new AbortController();
    const cargarPerfil = async () => {
      try {
        const response = await fetch(`${API}/api/users/mi-perfil`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Error al cargar perfil (${response.status})`);
        const data = await response.json();
        setPerfilUsuario(data.usuario ?? null);
      } catch (error) {
        if (error.name !== 'AbortError') console.error('Error al cargar perfil:', error);
      }
    };
    cargarPerfil();
    return () => controller.abort();
  }, [token]);



  const fetchData = async () => {
    if (!token) { setLoading(false); return; }

    try {
      const catalogosResponse = await fetch(`${API}/api/envios/catalogos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const catalogosData = await catalogosResponse.json();

      if (!catalogosResponse.ok) throw new Error(catalogosData.msg || 'No se pudieron cargar los catálogos');
      // Normaliza catálogos y elimina IDs repetidos antes de generar opciones JSX.
       const normalizar = (lista) => [...new Map(
         (Array.isArray(lista) ? lista : [])
           .filter((item) => item && item.id != null)
           .map((item) => [String(item.id), item])
       ).values()];
       const catalogosLimpios = {
         plantas: normalizar(catalogosData.plantas),
         areas: normalizar(catalogosData.areas),
         colaboradores: normalizar(catalogosData.colaboradores),
         usuarioActual: catalogosData.usuarioActual ?? null,
       };
       setCatalogos(catalogosLimpios);
      const responsableInicial = catalogosLimpios.colaboradores.find(
        (item) => Number(item.id) === Number(catalogosLimpios.usuarioActual?.idColaborador)
      );
      if (responsableInicial?.areaId != null) {
        setValue('id_area_origen', String(responsableInicial.areaId));
      }

      // Seleccionar automáticamente la ubicación del responsable
      if (responsableInicial?.ubicacionId != null) {
        setValue(
          'id_planta_origen',
          String(responsableInicial.ubicacionId),
          { shouldValidate: true }
        );
      }
    } catch (error) {
      toast.error(error.message || 'No se pudo cargar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const onSubmit = async (formData) => {

    if (String(formData.id_planta_origen) === String(formData.id_planta_destino)) {
      toast.error('La planta de origen y la planta de destino deben ser diferentes');
      return;
    }

    // El backend valida y asigna el responsable desde req.user.idColaborador.
    if (Number.isSafeInteger(idColaborador) && idColaborador > 0 &&
        String(idColaborador) === String(formData.id_destinatario)) {
      toast.error('El responsable y el destinatario deben ser diferentes');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API}/api/envios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData), // El backend asigna ID_Responsable desde req.user.idColaborador
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.msg || 'No se pudo crear la solicitud');

      toast.success('Solicitud de paquetería creada correctamente');
      reset({
        ...initialForm,
        fecha_salida: fechaLocal(),
        hora_entrega: horaLocal(),
      });
      await fetchData();
    } catch (error) {
      toast.error(error.message || 'Error creando la solicitud');
    } finally {
      setSaving(false);
    }
  };

  const renderOptions = (items, disabledId = '') => (Array.isArray(items) ? items : []).map((item) => (
    <option
      key={String(item.id)}
      value={item.id}
      disabled={disabledId !== '' && String(item.id) === String(disabledId)}
    >
      {item.nombre}
    </option>
  ));

  return (
    <div className="min-h-full bg-fondo p-4 md:p-6">
      <ToastContainer position="top-right" autoClose={3500} />
      <div className="mx-auto max-w-6xl space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-principal md:text-3xl">Solicitud de Paquetería</h1>
          <p className="mt-1 text-sm text-texto-muted">Registra una nueva solicitud de traslado para otra planta.</p>
        </div>

        <section className="rounded-2xl border border-borde bg-superficie p-5 shadow-sm md:p-7">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-principal p-2 text-inverso"><Package size={18} /></div>
            <h2 className="text-lg font-semibold text-principal">Datos de la solicitud</h2>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-texto-muted">
              <LoaderCircle className="animate-spin" size={18} /> Cargando catálogos...
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-principal">Fecha de salida *</span>
                <input type="date" {...register('fecha_salida', { required: 'La fecha de salida es obligatoria' })} className="w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm outline-none focus:border-acento" />{errors.fecha_salida && <span className="text-xs text-error">{errors.fecha_salida.message}</span>}
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-principal">Hora de salida</span>
                <input type="time" {...register('hora_entrega')} className="w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm outline-none focus:border-acento" />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-principal">Responsable *</span>
                <input type="text" readOnly value={perfilUsuario?.nombre || catalogos.usuarioActual?.nombre || responsableActual?.nombre || 'Cargando responsable...'} className="w-full rounded-lg border border-borde bg-superficie-muted px-3 py-2.5 text-sm text-principal" />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-principal">
                  Área de origen *
                </span>
                <input type="text" readOnly value={catalogos.areas.find((area) => String(area.id) === String(form.id_area_origen))?.nombre || ''} className="w-full rounded-lg border border-borde bg-superficie-muted px-3 py-2.5 text-sm text-principal"/><input type="hidden" {...register('id_area_origen', {required: 'El área de origen es obligatoria',})}/>{errors.id_area_origen && (<span className="text-xs text-error">{errors.id_area_origen.message}</span>)}
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-principal">Planta de origen *</span>
                <select {...register('id_planta_origen', { required: 'La planta de origen es obligatoria' })} className="w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm outline-none focus:border-acento"><option value="">Seleccione una planta</option>{renderOptions(catalogos.plantas, form.id_planta_destino)}</select>{errors.id_planta_origen && <span className="text-xs text-error">{errors.id_planta_origen.message}</span>}
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-principal">Tipo de contenido *</span>
                <input type="text" {...register('tipo_contenido', { required: 'El tipo de contenido es obligatorio', maxLength: 100, validate: (value) => value.trim() !== '' || 'El tipo de contenido es obligatorio' })} maxLength={100} placeholder="Ej. Documentos" className="w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm outline-none focus:border-acento" />{errors.tipo_contenido && <span className="text-xs text-error">{errors.tipo_contenido.message}</span>}
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-principal">Destinatario *</span>
                <select {...register('id_destinatario', { required: 'El destinatario es obligatorio', onChange: (event) => {
                  const destinatario = catalogos.colaboradores.find((item) => String(item.id) === event.target.value);
                  setValue('id_area_destino', destinatario?.areaId != null ? String(destinatario.areaId) : '',{ shouldValidate: true, shouldDirty: true });
                  setValue('id_planta_destino',destinatario?.ubicacionId != null ? String(destinatario.ubicacionId) : '',{ shouldValidate: true, shouldDirty: true });} })} className="w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm outline-none focus:border-acento"><option value="">Seleccione un destinatario</option>{renderOptions(catalogos.colaboradores, idColaborador)}</select>{errors.id_destinatario && <span className="text-xs text-error">{errors.id_destinatario.message}</span>}
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-principal">Área de destino *</span><input type="text"
                  readOnly value={catalogos.areas.find((area) => String(area.id) === String(form.id_area_destino))?.nombre || ''} placeholder="Seleccione un destinatario" className="w-full rounded-lg border border-borde bg-superficie-muted px-3 py-2.5 text-sm text-principal cursor-not-allowed"/><input type="hidden" {...register('id_area_destino', { required: 'El área de destino es obligatoria',})}/>{errors.id_area_destino && (<span className="text-xs text-error">{errors.id_area_destino.message}</span>)}
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-principal">Planta de destino *</span>
                <select {...register('id_planta_destino', { required: 'La planta de destino es obligatoria' })} className="w-full rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm outline-none focus:border-acento"><option value="">Seleccione una planta</option>{renderOptions(catalogos.plantas, form.id_planta_origen)}</select>{errors.id_planta_destino && <span className="text-xs text-error">{errors.id_planta_destino.message}</span>}
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-xs font-semibold text-principal">Comentario</span>
                <textarea {...register('comentario')} rows={3} maxLength={1000} placeholder="Ingrese el detalle del envío (opcional)" className="w-full resize-none rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm outline-none focus:border-acento" />
              </label>

              <div className="md:col-span-2">
                <button type="submit" disabled={saving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-principal px-5 py-2.5 text-sm font-semibold text-inverso transition hover:bg-principal-hover disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}
                  {saving ? 'Guardando...' : 'Guardar solicitud'}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
};

export default SolicitudPaqueteria;
