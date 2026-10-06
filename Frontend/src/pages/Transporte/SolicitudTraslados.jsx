import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CheckCircle2, LoaderCircle, Car, Bus, BadgeDollarSign, ClipboardList } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import storeAuth from '../../context/storeAuth';
import { getAuthClaims } from '../../utils/authClaims';

const API = import.meta.env.VITE_BACKEND_URL;

const obtenerFechaLocal = () => {
  const ahora = new Date();
  const offset = ahora.getTimezoneOffset() * 60000;
  return new Date(ahora.getTime() - offset).toISOString().slice(0, 10);
};

const obtenerHoraLocal = () => new Date().toLocaleTimeString('es-EC', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const SolicitudTraslados = () => {
  const token = storeAuth((state) => state.token);
  const claims = getAuthClaims(token);
  const role = (claims?.rol || '').toLowerCase();
  
  const PLANTAS = [
    { id: 1, nombre: 'Planta Central' },
    { id: 2, nombre: 'El Carmen' },
    { id: 3, nombre: 'Oficinas Centrales' }
  ];
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [tabIndex, setTabIndex] = useState('EMPRESARIAL'); // EMPRESARIAL, PERSONAL, PRIVADO
  const [choferes, setChoferes] = useState([]);
  const [loadingChoferes, setLoadingChoferes] = useState(false);

  const defaultValues = {
    fecha_salida: obtenerFechaLocal(),
    hora_salida: obtenerHoraLocal(),
    hora_llegada: '',
    id_planta_origen: '',
    id_planta_destino: '',
    motivo_viaje: '',
    id_chofer: '',
    km_inicial: '',
    km_final: '',
    monto_solicitado: '',
  };
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({ defaultValues, shouldUnregister: true });
  const form = watch();

  const canCreate = role.includes('solicitante') || role.includes('administrador') || role.includes('jefe');

  useEffect(() => {
    if (!token || !canCreate) return;

    const cargarChoferes = async () => {
      setLoadingChoferes(true);
      try {
        const response = await fetch(`${API}/api/traslados/choferes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.msg || 'No se pudieron cargar los choferes');
        setChoferes(data.choferes || []);
      } catch (error) {
        toast.error(error.message || 'No se pudieron cargar los choferes');
      } finally {
        setLoadingChoferes(false);
      }
    };

    cargarChoferes();
  }, [token, canCreate]);

  const onSubmit = async (formData) => {
    if (!token) return;

    if (tabIndex === 'PERSONAL' && Number(formData.km_final) < Number(formData.km_inicial)) {
      toast.error('El KM final no puede ser menor que el KM inicial');
      return;
    }

    if (formData.id_planta_origen === formData.id_planta_destino) {
      toast.error('La planta de origen y destino deben ser diferentes');
      return;
    }

    setIsGenerating(true);

    let endpoint = '';
    if (tabIndex === 'EMPRESARIAL') endpoint = '/api/traslados/empresarial';
    if (tabIndex === 'PERSONAL') endpoint = '/api/traslados/personal';
    if (tabIndex === 'PRIVADO') endpoint = '/api/traslados/privado';

    try {
      const response = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok || data?.success === false) {
        throw new Error(data?.msg || 'No se pudo registrar');
      }

      toast.success(`Transporte ${tabIndex.toLowerCase()} solicitado correctamente.`);
      reset({
        ...defaultValues,
        fecha_salida: obtenerFechaLocal(),
        hora_salida: obtenerHoraLocal(),
        motivo_viaje: '',
        id_chofer: '',
        km_inicial: '',
        km_final: '',
        hora_llegada: '',
        monto_solicitado: '',
      });
    } catch (error) {
      toast.error(error.message || 'Error al registrar.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <ToastContainer position="top-right" autoClose={4000} />
      <div className="mx-auto max-w-7xl space-y-1">
        {canCreate && (
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-[#17243d] md:text-3xl">Solicitud de Transporte</h1>
            <p className="mt-1 text-sm text-slate-500">Registra una nueva solicitud de transporte para su respectiva gestión.</p>
          </div>
        )}

        {canCreate && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-[#17243d] p-2.5 text-white">
                <ClipboardList size={19} />
              </div>
              <h2 className="text-lg font-bold text-[#17243d]">Datos de la solicitud</h2>
            </div>

            <div className="mb-6 flex flex-wrap gap-3">
              {[
                { id: 'EMPRESARIAL', label: 'Empresarial', icon: Car },
                { id: 'PRIVADO', label: 'Privado', icon: Bus },
                { id: 'PERSONAL', label: 'Personal', icon: BadgeDollarSign },
              ].map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" onClick={() => setTabIndex(id)} className={`flex min-w-32 items-center justify-center gap-2 rounded-md border px-5 py-2.5 text-xs font-bold transition ${tabIndex === id ? 'border-[#17243d] bg-[#17243d] text-white shadow-sm' : 'border-slate-200 bg-white text-[#315b86] hover:border-[#9ab2cc]'}`}>
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-x-7 gap-y-4 md:grid-cols-2">
              <label className="space-y-1.5"><span className="text-xs font-bold text-[#17243d]">Fecha de salida</span><input type="date" {...register('fecha_salida', { required: 'La fecha de salida es obligatoria' })} className="w-full rounded-md border border-slate-200 bg-[#f5f7fa] px-3 py-2.5 text-sm outline-none focus:border-[#315b86]" />{errors.fecha_salida && <span className="text-xs text-red-600">{errors.fecha_salida.message}</span>}</label>

              {tabIndex === 'EMPRESARIAL' ? (
                <label className="space-y-1.5"><span className="text-xs font-bold text-[#17243d]">Chofer</span><select {...register('id_chofer', { required: 'El chofer es obligatorio' })} disabled={loadingChoferes} className="w-full rounded-md border border-slate-200 bg-[#f5f7fa] px-3 py-2.5 text-sm outline-none focus:border-[#315b86]"><option value="">{loadingChoferes ? 'Cargando choferes...' : 'Seleccione un chofer'}</option>{choferes.map((chofer) => <option key={chofer.id} value={chofer.id}>{chofer.nombre}</option>)}</select>{errors.id_chofer && <span className="text-xs text-red-600">{errors.id_chofer.message}</span>}</label>
              ) : (
                <label className="space-y-1.5"><span className="text-xs font-bold text-[#17243d]">Hora de llegada *</span><input type="time" {...register('hora_llegada', { required: 'La hora de llegada es obligatoria' })} className="w-full rounded-md border border-slate-200 bg-[#f5f7fa] px-3 py-2.5 text-sm outline-none focus:border-[#315b86]" />{errors.hora_llegada && <span className="text-xs text-red-600">{errors.hora_llegada.message}</span>}</label>
              )}

              <label className="space-y-1.5"><span className="text-xs font-bold text-[#17243d]">Hora de salida</span><input type="time" {...register('hora_salida', { required: 'La hora de salida es obligatoria' })} className="w-full rounded-md border border-slate-200 bg-[#f5f7fa] px-3 py-2.5 text-sm outline-none focus:border-[#315b86]" />{errors.hora_salida && <span className="text-xs text-red-600">{errors.hora_salida.message}</span>}</label>
              {tabIndex === 'EMPRESARIAL' && <label className="space-y-1.5"><span className="text-xs font-bold text-[#17243d]">Hora de llegada *</span><input type="time" {...register('hora_llegada', { required: 'La hora de llegada es obligatoria' })} className="w-full rounded-md border border-slate-200 bg-[#f5f7fa] px-3 py-2.5 text-sm outline-none focus:border-[#315b86]" />{errors.hora_llegada && <span className="text-xs text-red-600">{errors.hora_llegada.message}</span>}</label>}

              {tabIndex === 'PERSONAL' && <><label className="space-y-1.5"><span className="text-xs font-bold text-[#17243d]">KM inicial</span><input type="number" min="0" step="0.01" {...register('km_inicial', { required: 'El KM inicial es obligatorio', valueAsNumber: true })} className="w-full rounded-md border border-slate-200 bg-[#f5f7fa] px-3 py-2.5 text-sm outline-none focus:border-[#315b86]" />{errors.km_inicial && <span className="text-xs text-red-600">{errors.km_inicial.message}</span>}</label><label className="space-y-1.5"><span className="text-xs font-bold text-[#17243d]">KM final</span><input type="number" min={form.km_inicial || 0} step="0.01" {...register('km_final', { required: 'El KM final es obligatorio', valueAsNumber: true })} className="w-full rounded-md border border-slate-200 bg-[#f5f7fa] px-3 py-2.5 text-sm outline-none focus:border-[#315b86]" />{errors.km_final && <span className="text-xs text-red-600">{errors.km_final.message}</span>}</label></>}

              <label className="space-y-1.5"><span className="text-xs font-bold text-[#17243d]">Planta de origen</span><select {...register('id_planta_origen', { required: 'La planta de origen es obligatoria' })} className="w-full rounded-md border border-slate-200 bg-[#f5f7fa] px-3 py-2.5 text-sm outline-none focus:border-[#315b86]"><option value="" disabled>Ingrese la Planta de Origen</option>{PLANTAS.map((planta) => <option key={planta.id} value={planta.id}>{planta.nombre}</option>)}</select>{errors.id_planta_origen && <span className="text-xs text-red-600">{errors.id_planta_origen.message}</span>}</label>
              <label className="space-y-1.5"><span className="text-xs font-bold text-[#17243d]">Planta de destino</span><select {...register('id_planta_destino', { required: 'La planta de destino es obligatoria' })} className="w-full rounded-md border border-slate-200 bg-[#f5f7fa] px-3 py-2.5 text-sm outline-none focus:border-[#315b86]"><option value="" disabled>Ingrese la Planta de Destino</option>{PLANTAS.map((planta) => <option key={planta.id} value={planta.id}>{planta.nombre}</option>)}</select>{errors.id_planta_destino && <span className="text-xs text-red-600">{errors.id_planta_destino.message}</span>}</label>

              <label className="space-y-1.5 md:col-span-2"><span className="text-xs font-bold text-[#17243d]">Motivo</span><textarea {...register('motivo_viaje', { required: 'El motivo es obligatorio', validate: (value) => value.trim() !== '' || 'El motivo es obligatorio' })} rows={2} placeholder="Ingrese el motivo de la salida..." className="w-full resize-none rounded-md border border-slate-200 bg-[#f5f7fa] px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-[#315b86]" />{errors.motivo_viaje && <span className="text-xs text-red-600">{errors.motivo_viaje.message}</span>}</label>
              {(tabIndex === 'PERSONAL' || tabIndex === 'PRIVADO') && <label className="space-y-1.5"><span className="text-xs font-bold text-[#17243d]">Monto</span><input type="number" min="0.01" step="0.01" {...register('monto_solicitado', { required: 'El monto es obligatorio', min: { value: 0.01, message: 'El monto debe ser mayor que cero' }, valueAsNumber: true })} placeholder="Ingrese el monto" className="w-full rounded-md border border-slate-200 bg-[#f5f7fa] px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-[#315b86]" />{errors.monto_solicitado && <span className="text-xs text-red-600">{errors.monto_solicitado.message}</span>}</label>}

              <div className="pt-2 md:col-span-2"><button type="submit" disabled={isGenerating} className="inline-flex items-center gap-2 rounded-md bg-[#17243d] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#223a5d] disabled:opacity-60">{isGenerating ? <LoaderCircle className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} Guardar solicitud</button></div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};

export default SolicitudTraslados;
