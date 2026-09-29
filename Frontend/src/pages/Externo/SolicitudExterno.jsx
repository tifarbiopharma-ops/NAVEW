import { useEffect, useState } from 'react';
import { LoaderCircle, Send, UserRound } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import storeAuth from '../../context/storeAuth';

const API = import.meta.env.VITE_BACKEND_URL;

const initialForm = {
  empresa: '',
  nombre_apellido: '',
  cedula: '',
  telefono: '',
  id_empleado_visitado: '',
  area_visita: '',
  id_planta_destino: '',
  fecha_visita: new Date().toISOString().slice(0, 10),
  hora_ingreso: '',
  hora_salida: '',
  motivo: '',
};

const SolicitudExterno = () => {
  const token = storeAuth((state) => state.token);
  const [form, setForm] = useState(initialForm);
  const [catalogos, setCatalogos] = useState({ plantas: [], colaboradores: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadCatalogos = async () => {
      if (!token) return;
      try {
        const response = await fetch(`${API}/api/accesos/catalogos`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.msg || 'No se pudieron cargar los catálogos');
        setCatalogos(data);
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadCatalogos();
  }, [token]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(`${API}/api/accesos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.msg || 'No se pudo crear la solicitud');
      toast.success('Solicitud de acceso externo creada correctamente');
      setForm({ ...initialForm, id_empleado_visitado: '' });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const options = (items) => items.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>);

  return (
    <div className="min-h-full bg-[#f4f7fa] p-4 md:p-6">
      <ToastContainer position="top-right" autoClose={3500} />
      <div className="mx-auto max-w-6xl">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-[#17243d] md:text-3xl">Solicitud de Proveedor Externo</h1>
          <p className="mt-1 text-sm text-slate-500">Registra una nueva solicitud de ingreso de personal externo.</p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-[#17243d] p-2 text-white"><UserRound size={18} /></div>
            <h2 className="text-lg font-semibold text-[#17243d]">Datos de la solicitud</h2>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18} /> Cargando catálogos...</div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5"><span className="text-xs font-semibold text-[#17243d]">Empresa *</span><input name="empresa" value={form.empresa} onChange={handleChange} required maxLength={100} placeholder="Ingrese el nombre de la Empresa" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]" /></label>
              <label className="space-y-1.5"><span className="text-xs font-semibold text-[#17243d]">Nombre y Apellido *</span><input name="nombre_apellido" value={form.nombre_apellido} onChange={handleChange} required maxLength={150} placeholder="Ingrese el nombre del funcionario" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]" /></label>
              <label className="space-y-1.5"><span className="text-xs font-semibold text-[#17243d]">N° Cédula *</span><input name="cedula" value={form.cedula} onChange={handleChange} required maxLength={20} placeholder="Ingrese el número de Cédula" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]" /></label>
              <label className="space-y-1.5"><span className="text-xs font-semibold text-[#17243d]">Teléfono *</span><input name="telefono" value={form.telefono} onChange={handleChange} required maxLength={20} placeholder="Ingrese el número de teléfono" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]" /></label>
              <label className="space-y-1.5"><span className="text-xs font-semibold text-[#17243d]">Persona a quién visita *</span><select name="id_empleado_visitado" value={form.id_empleado_visitado} onChange={handleChange} required className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]"><option value="">Seleccione un colaborador</option>{options(catalogos.colaboradores)}</select></label>
              <label className="space-y-1.5"><span className="text-xs font-semibold text-[#17243d]">Área a quién visita *</span><input name="area_visita" value={form.area_visita} onChange={handleChange} required maxLength={100} placeholder="Ingrese el nombre del Área que se dirige" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]" /></label>
              <label className="space-y-1.5"><span className="text-xs font-semibold text-[#17243d]">Planta a la que se dirige *</span><select name="id_planta_destino" value={form.id_planta_destino} onChange={handleChange} required className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]"><option value="">Seleccione una planta</option>{options(catalogos.plantas)}</select></label>
              <label className="space-y-1.5"><span className="text-xs font-semibold text-[#17243d]">Fecha de la visita *</span><input type="date" name="fecha_visita" value={form.fecha_visita} onChange={handleChange} required className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]" /></label>
              <label className="space-y-1.5"><span className="text-xs font-semibold text-[#17243d]">Hora de ingreso</span><input type="time" name="hora_ingreso" value={form.hora_ingreso} onChange={handleChange} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]" /></label>
              <label className="space-y-1.5"><span className="text-xs font-semibold text-[#17243d]">Hora de salida</span><input type="time" name="hora_salida" value={form.hora_salida} onChange={handleChange} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]" /></label>
              <label className="space-y-1.5 md:col-span-2"><span className="text-xs font-semibold text-[#17243d]">Motivo de la visita</span><textarea name="motivo" value={form.motivo} onChange={handleChange} rows={3} placeholder="Ingrese el detalle de la visita" className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86]" /></label>
              <div className="md:col-span-2"><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#17243d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#223a5d] disabled:cursor-not-allowed disabled:opacity-60">{saving ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}{saving ? 'Guardando...' : 'Guardar solicitud'}</button></div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
};

export default SolicitudExterno;
