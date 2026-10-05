import { useState } from 'react';
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

  const [form, setForm] = useState({
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
  });

  const canCreate = role.includes('solicitante') || role.includes('administrador') || role.includes('jefe');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;

    const camposFaltantes = [];
    if (!form.fecha_salida) camposFaltantes.push('fecha de salida');
    if (!form.hora_salida) camposFaltantes.push('hora de salida');
    if (!form.id_planta_origen) camposFaltantes.push('planta de origen');
    if (!form.id_planta_destino) camposFaltantes.push('planta de destino');
    if (!form.motivo_viaje.trim()) camposFaltantes.push('motivo');
    if (tabIndex === 'EMPRESARIAL' && !form.id_chofer.trim()) camposFaltantes.push('chofer');
    if ((tabIndex === 'PERSONAL' || tabIndex === 'PRIVADO') && (!form.monto_solicitado || Number(form.monto_solicitado) <= 0)) camposFaltantes.push('monto válido');
    if (tabIndex === 'PERSONAL' && !form.km_inicial) camposFaltantes.push('KM inicial');
    if (tabIndex === 'PERSONAL' && !form.km_final) camposFaltantes.push('KM final');

    if (camposFaltantes.length > 0) {
      toast.error(`Completa: ${camposFaltantes.join(', ')}`);
      return;
    }

    if (tabIndex === 'PERSONAL' && Number(form.km_final) < Number(form.km_inicial)) {
      toast.error('El KM final no puede ser menor que el KM inicial');
      return;
    }

    if (form.id_planta_origen === form.id_planta_destino) {
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
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok || data?.success === false) {
        throw new Error(data?.msg || 'No se pudo registrar');
      }

      toast.success(`Transporte ${tabIndex.toLowerCase()} solicitado correctamente.`);
      setForm({
        ...form,
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

            <form onSubmit={handleSubmit} className="grid gap-x-7 gap-y-4 md:grid-cols-2">
              <label className="space-y-1.5"><span className="text-xs font-bold text-[#17243d]">Fecha de salida</span><input type="date" name="fecha_salida" value={form.fecha_salida} onChange={handleChange} required className="w-full rounded-md border border-slate-200 bg-[#f5f7fa] px-3 py-2.5 text-sm outline-none focus:border-[#315b86]" /></label>

              {tabIndex === 'EMPRESARIAL' ? (
                <label className="space-y-1.5"><span className="text-xs font-bold text-[#17243d]">Chofer</span><input type="text" name="id_chofer" value={form.id_chofer} onChange={handleChange} required placeholder="Ingrese el nombre del chofer" className="w-full rounded-md border border-slate-200 bg-[#f5f7fa] px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-[#315b86]" /></label>
              ) : (
                <label className="space-y-1.5"><span className="text-xs font-bold text-[#17243d]">Hora de llegada</span><input type="time" name="hora_llegada" value={form.hora_llegada} onChange={handleChange} className="w-full rounded-md border border-slate-200 bg-[#f5f7fa] px-3 py-2.5 text-sm outline-none focus:border-[#315b86]" /></label>
              )}

              <label className="space-y-1.5"><span className="text-xs font-bold text-[#17243d]">Hora de salida</span><input type="time" name="hora_salida" value={form.hora_salida} onChange={handleChange} required className="w-full rounded-md border border-slate-200 bg-[#f5f7fa] px-3 py-2.5 text-sm outline-none focus:border-[#315b86]" /></label>
              {tabIndex === 'EMPRESARIAL' && <label className="space-y-1.5"><span className="text-xs font-bold text-[#17243d]">Hora de llegada</span><input type="time" name="hora_llegada" value={form.hora_llegada} onChange={handleChange} className="w-full rounded-md border border-slate-200 bg-[#f5f7fa] px-3 py-2.5 text-sm outline-none focus:border-[#315b86]" /></label>}

              {tabIndex === 'PERSONAL' && <><label className="space-y-1.5"><span className="text-xs font-bold text-[#17243d]">KM inicial</span><input type="number" min="0" step="0.01" name="km_inicial" value={form.km_inicial} onChange={handleChange} required className="w-full rounded-md border border-slate-200 bg-[#f5f7fa] px-3 py-2.5 text-sm outline-none focus:border-[#315b86]" /></label><label className="space-y-1.5"><span className="text-xs font-bold text-[#17243d]">KM final</span><input type="number" min={form.km_inicial || 0} step="0.01" name="km_final" value={form.km_final} onChange={handleChange} required className="w-full rounded-md border border-slate-200 bg-[#f5f7fa] px-3 py-2.5 text-sm outline-none focus:border-[#315b86]" /></label></>}

              <label className="space-y-1.5"><span className="text-xs font-bold text-[#17243d]">Planta de origen</span><select name="id_planta_origen" value={form.id_planta_origen} onChange={handleChange} required className="w-full rounded-md border border-slate-200 bg-[#f5f7fa] px-3 py-2.5 text-sm outline-none focus:border-[#315b86]"><option value="" disabled>Ingrese la Planta de Origen</option>{PLANTAS.map((planta) => <option key={planta.id} value={planta.id}>{planta.nombre}</option>)}</select></label>
              <label className="space-y-1.5"><span className="text-xs font-bold text-[#17243d]">Planta de destino</span><select name="id_planta_destino" value={form.id_planta_destino} onChange={handleChange} required className="w-full rounded-md border border-slate-200 bg-[#f5f7fa] px-3 py-2.5 text-sm outline-none focus:border-[#315b86]"><option value="" disabled>Ingrese la Planta de Destino</option>{PLANTAS.map((planta) => <option key={planta.id} value={planta.id}>{planta.nombre}</option>)}</select></label>

              <label className="space-y-1.5 md:col-span-2"><span className="text-xs font-bold text-[#17243d]">Motivo</span><textarea name="motivo_viaje" value={form.motivo_viaje} onChange={handleChange} required rows={2} placeholder="Ingrese el motivo de la salida..." className="w-full resize-none rounded-md border border-slate-200 bg-[#f5f7fa] px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-[#315b86]" /></label>
              {(tabIndex === 'PERSONAL' || tabIndex === 'PRIVADO') && <label className="space-y-1.5"><span className="text-xs font-bold text-[#17243d]">Monto</span><input type="number" step="0.01" name="monto_solicitado" value={form.monto_solicitado} onChange={handleChange} required placeholder="Ingrese el monto" className="w-full rounded-md border border-slate-200 bg-[#f5f7fa] px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-[#315b86]" /></label>}

              <div className="pt-2 md:col-span-2"><button type="submit" disabled={isGenerating} className="inline-flex items-center gap-2 rounded-md bg-[#17243d] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#223a5d] disabled:opacity-60">{isGenerating ? <LoaderCircle className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} Guardar solicitud</button></div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};

export default SolicitudTraslados;
