import { useEffect, useState } from 'react';
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
  const [form, setForm] = useState(initialForm);
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
      setForm((previous) => ({
        ...previous,
        id_responsable: previous.id_responsable || String(claims?.id || ''),
        id_area_origen: previous.id_area_origen || String(responsableInicial?.areaId || ''),
      }));
    } catch (error) {
      toast.error(error.message || 'No se pudo cargar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === 'id_responsable') {
      const responsable = catalogos.colaboradores.find((item) => String(item.id) === value);
      setForm((previous) => ({
        ...previous,
        id_responsable: value,
        id_area_origen: responsable?.areaId ? String(responsable.areaId) : previous.id_area_origen,
      }));
      return;
    }
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (String(form.id_planta_origen) === String(form.id_planta_destino)) {
      toast.error('La planta de origen y la planta de destino deben ser diferentes');
      return;
    }

    if (String(form.id_responsable) === String(form.id_destinatario)) {
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
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.msg || 'No se pudo crear la solicitud');

      toast.success('Solicitud de paquetería creada correctamente');
      setForm({
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
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-[#17243d]">Fecha de salida *</span>
                <input type="date" name="fecha_salida" value={form.fecha_salida} onChange={handleChange} required className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]" />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-[#17243d]">Hora de entrega</span>
                <input type="time" name="hora_entrega" value={form.hora_entrega} onChange={handleChange} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]" />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-[#17243d]">Planta de origen *</span>
                <select name="id_planta_origen" value={form.id_planta_origen} onChange={handleChange} required className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]"><option value="">Seleccione una planta</option>{renderOptions(catalogos.plantas, form.id_planta_destino)}</select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-[#17243d]">Área de origen *</span>
                <select name="id_area_origen" value={form.id_area_origen} onChange={handleChange} required className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]"><option value="">Seleccione un área</option>{renderOptions(catalogos.areas)}</select>
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-[#17243d]">Responsable *</span>
                <select name="id_responsable" value={form.id_responsable} onChange={handleChange} required className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]"><option value="">Seleccione un responsable</option>{renderOptions(catalogos.colaboradores, form.id_destinatario)}</select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-[#17243d]">Tipo de contenido *</span>
                <input type="text" name="tipo_contenido" value={form.tipo_contenido} onChange={handleChange} required maxLength={100} placeholder="Ej. Documentos" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]" />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-[#17243d]">Planta de destino *</span>
                <select name="id_planta_destino" value={form.id_planta_destino} onChange={handleChange} required className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]"><option value="">Seleccione una planta</option>{renderOptions(catalogos.plantas, form.id_planta_origen)}</select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-[#17243d]">Área de destino *</span>
                <select name="id_area_destino" value={form.id_area_destino} onChange={handleChange} required className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]"><option value="">Seleccione un área</option>{renderOptions(catalogos.areas)}</select>
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-[#17243d]">Destinatario *</span>
                <select name="id_destinatario" value={form.id_destinatario} onChange={handleChange} required className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]"><option value="">Seleccione un destinatario</option>{renderOptions(catalogos.colaboradores, form.id_responsable)}</select>
              </label>
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-xs font-semibold text-[#17243d]">Comentario</span>
                <textarea name="comentario" value={form.comentario} onChange={handleChange} rows={3} maxLength={1000} placeholder="Ingrese el detalle del envío (opcional)" className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]" />
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