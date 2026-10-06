import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { LoaderCircle, Package, Send } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import storeAuth from '../../context/storeAuth';
import { getAuthClaims } from '../../utils/authClaims';

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
  id_responsable: '',
  id_planta_destino: '',
  id_area_destino: '',
  id_destinatario: '',
  tipo_contenido: '',
  comentario: '',
};

const SolicitudPaqueteria = () => {
  const token = storeAuth((state) => state.token);
  const claims = getAuthClaims(token);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({ defaultValues: initialForm });
  const form = watch();
  const [catalogos, setCatalogos] = useState({ plantas: [], areas: [], colaboradores: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    if (!token) return;

    try {
      const catalogosResponse = await fetch(`${API}/api/envios/catalogos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const catalogosData = await catalogosResponse.json();

      if (!catalogosResponse.ok) throw new Error(catalogosData.msg || 'No se pudieron cargar los catálogos');
      setCatalogos(catalogosData);
      const responsableInicial = catalogosData.colaboradores.find(
        (item) => String(item.id) === String(claims?.id)
      );
      if (!form.id_responsable) setValue('id_responsable', String(claims?.id || ''));
      if (!form.id_area_origen) setValue('id_area_origen', String(responsableInicial?.areaId || ''));
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

    if (String(formData.id_responsable) === String(formData.id_destinatario)) {
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
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.msg || 'No se pudo crear la solicitud');

      toast.success('Solicitud de paquetería creada correctamente');
      reset({
        ...initialForm,
        fecha_salida: fechaLocal(),
        hora_entrega: horaLocal(),
        id_responsable: String(claims?.id || ''),
      });
      await fetchData();
    } catch (error) {
      toast.error(error.message || 'Error creando la solicitud');
    } finally {
      setSaving(false);
    }
  };

  const renderOptions = (items, disabledId = '') => items.map((item) => (
    <option
      key={item.id}
      value={item.id}
      disabled={disabledId !== '' && String(item.id) === String(disabledId)}
    >
      {item.nombre}
    </option>
  ));

  return (
    <div className="min-h-full bg-[#f4f7fa] p-4 md:p-6">
      <ToastContainer position="top-right" autoClose={3500} />
      <div className="mx-auto max-w-6xl space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-[#17243d] md:text-3xl">Solicitud de Paquetería</h1>
          <p className="mt-1 text-sm text-slate-500">Registra una nueva solicitud de traslado para otra planta.</p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-[#17243d] p-2 text-white"><Package size={18} /></div>
            <h2 className="text-lg font-semibold text-[#17243d]">Datos de la solicitud</h2>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
              <LoaderCircle className="animate-spin" size={18} /> Cargando catálogos...
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-[#17243d]">Fecha de salida *</span>
                <input type="date" {...register('fecha_salida', { required: 'La fecha de salida es obligatoria' })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]" />{errors.fecha_salida && <span className="text-xs text-red-600">{errors.fecha_salida.message}</span>}
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-[#17243d]">Hora de entrega</span>
                <input type="time" {...register('hora_entrega')} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]" />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-[#17243d]">Planta de origen *</span>
                <select {...register('id_planta_origen', { required: 'La planta de origen es obligatoria' })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]"><option value="">Seleccione una planta</option>{renderOptions(catalogos.plantas, form.id_planta_destino)}</select>{errors.id_planta_origen && <span className="text-xs text-red-600">{errors.id_planta_origen.message}</span>}
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-[#17243d]">Área de origen *</span>
                <select {...register('id_area_origen', { required: 'El área de origen es obligatoria' })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]"><option value="">Seleccione un área</option>{renderOptions(catalogos.areas)}</select>{errors.id_area_origen && <span className="text-xs text-red-600">{errors.id_area_origen.message}</span>}
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-[#17243d]">Responsable *</span>
                <select {...register('id_responsable', { required: true, onChange: (event) => {
                  const responsable = catalogos.colaboradores.find((item) => String(item.id) === event.target.value);
                  if (responsable?.areaId) setValue('id_area_origen', String(responsable.areaId));
                } })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]"><option value="">Seleccione un responsable</option>{renderOptions(catalogos.colaboradores, form.id_destinatario)}</select>{errors.id_responsable && <span className="text-xs text-red-600">{errors.id_responsable.message}</span>}
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-[#17243d]">Tipo de contenido *</span>
                <input type="text" {...register('tipo_contenido', { required: 'El tipo de contenido es obligatorio', maxLength: 100, validate: (value) => value.trim() !== '' || 'El tipo de contenido es obligatorio' })} maxLength={100} placeholder="Ej. Documentos" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]" />{errors.tipo_contenido && <span className="text-xs text-red-600">{errors.tipo_contenido.message}</span>}
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-[#17243d]">Planta de destino *</span>
                <select {...register('id_planta_destino', { required: 'La planta de destino es obligatoria' })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]"><option value="">Seleccione una planta</option>{renderOptions(catalogos.plantas, form.id_planta_origen)}</select>{errors.id_planta_destino && <span className="text-xs text-red-600">{errors.id_planta_destino.message}</span>}
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-[#17243d]">Área de destino *</span>
                <select {...register('id_area_destino', { required: 'El área de destino es obligatoria' })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]"><option value="">Seleccione un área</option>{renderOptions(catalogos.areas)}</select>{errors.id_area_destino && <span className="text-xs text-red-600">{errors.id_area_destino.message}</span>}
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-[#17243d]">Destinatario *</span>
                <select {...register('id_destinatario', { required: 'El destinatario es obligatorio', onChange: (event) => {
                  const destinatario = catalogos.colaboradores.find((item) => String(item.id) === event.target.value);
                  setValue('id_area_destino', destinatario?.areaId ? String(destinatario.areaId) : '', { shouldValidate: true, shouldDirty: true });
                } })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]"><option value="">Seleccione un destinatario</option>{renderOptions(catalogos.colaboradores, form.id_responsable)}</select>{errors.id_destinatario && <span className="text-xs text-red-600">{errors.id_destinatario.message}</span>}
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-xs font-semibold text-[#17243d]">Comentario</span>
                <textarea {...register('comentario')} rows={3} maxLength={1000} placeholder="Ingrese el detalle del envío (opcional)" className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]" />
              </label>

              <div className="md:col-span-2">
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#17243d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#223a5d] disabled:cursor-not-allowed disabled:opacity-60">
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