import { useEffect, useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { QrCode, CheckCircle2, Search, LoaderCircle, PlusCircle, Car, Bus, BadgeDollarSign } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import storeAuth from '../../context/storeAuth';
import { getAuthClaims } from '../../utils/authClaims';

const API = import.meta.env.VITE_BACKEND_URL;

const TransporteDashboard = () => {
  const location = useLocation();
  const token = storeAuth((state) => state.token);
  const claims = getAuthClaims(token);
  const role = (claims?.rol || '').toLowerCase();
  
  const isAprobadasView = new URLSearchParams(location.search).get('view') === 'aprobadas';
  
  const PLANTAS = [
    { id: 1, nombre: 'Planta Central' },
    { id: 2, nombre: 'El Carmen' },
    { id: 3, nombre: 'Oficinas Centrales' }
  ];
  
  const [traslados, setTraslados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tabIndex, setTabIndex] = useState('EMPRESARIAL'); // EMPRESARIAL, PERSONAL, PRIVADO

  const [form, setForm] = useState({
    fecha_salida: new Date().toISOString().slice(0, 10),
    hora_salida: '',
    id_planta_origen: '',
    id_planta_destino: '',
    motivo_viaje: '',
    observaciones: '',
    id_chofer: '',
    monto_solicitado: '',
    evidencia_costo: '',
  });

  const [qrSeleccionado, setQrSeleccionado] = useState(null);
  const [progresoSeleccionado, setProgresoSeleccionado] = useState(null);
  const [progresoLoading, setProgresoLoading] = useState(false);

  const fetchTraslados = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/traslados/historial`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data?.success) {
        setTraslados(data.traslados || []);
      }
    } catch (error) {
      console.error('Error al cargar traslados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTraslados();
  }, [token]);

  const canCreate = role.includes('solicitante') || role.includes('administrador');
  const canApprove = role.includes('jefe') || role.includes('administrador');
  const canSeeQr = role.includes('solicitante') || role.includes('jefe') || role.includes('administrador');
  const canValidateQr = role.includes('supervisor') || role.includes('administrador');
  const isSolicitante = role.includes('solicitante');

  const filteredTraslados = useMemo(() => {
    if (role.includes('jefe')) {
      return traslados.filter((t) => t.Estado_Actual === 'SOLICITADO' || t.Estado_Actual === 'PENDIENTE');
    }
    if (isAprobadasView) {
      return traslados.filter((t) => t.Estado_Actual === 'APROBADO_JEFE');
    }
    return traslados;
  }, [traslados, role, isAprobadasView]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;

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
        motivo_viaje: '',
        observaciones: '',
        id_chofer: '',
        monto_solicitado: '',
        evidencia_costo: '',
      });
      await fetchTraslados();
    } catch (error) {
      toast.error(error.message || 'Error al registrar.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async (id, accion) => {
    if (!token) return;
    try {
      const response = await fetch(`${API}/api/traslados/approve/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ accion, comentario: '' }),
      });
      const data = await response.json();
      if (!response.ok || data?.success === false) {
        throw new Error(data?.msg || 'Error al procesar la aprobación');
      }
      toast.success(data.msg);
      await fetchTraslados();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const loadProgreso = async (id) => {
    setProgresoLoading(true);
    try {
      const response = await fetch(`${API}/api/traslados/progreso/${id}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data?.success) {
        setProgresoSeleccionado(data.progreso);
      } else {
        toast.error('No se pudo cargar el progreso');
      }
    } catch (err) {
      toast.error('Error al cargar la trazabilidad');
    } finally {
      setProgresoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <ToastContainer position="top-right" autoClose={4000} />
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Módulo Logístico</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Transporte de Empleados</h1>
          </div>
          <div className="flex gap-3">
            {canValidateQr && (
              <Link to="/dashboard/transporte/validar" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 shadow-sm hover:bg-slate-100">
                <Search size={18} /> Validar Código QR
              </Link>
            )}
          </div>
        </div>

        {canCreate && !canApprove && !isAprobadasView && (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-[#17243D] p-2 text-white">
                <PlusCircle size={20} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Solicitar Transporte</h2>
                <p className="text-sm text-slate-500">Completa el formulario para generar un viaje trazable (Process Mining).</p>
              </div>
            </div>

            <div className="mb-6 flex space-x-2 border-b border-slate-200">
              <button onClick={() => setTabIndex('EMPRESARIAL')} className={`px-4 py-2 font-medium ${tabIndex === 'EMPRESARIAL' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                <Car className="inline-block mr-2" size={18} /> Empresarial
              </button>
              <button onClick={() => setTabIndex('PERSONAL')} className={`px-4 py-2 font-medium ${tabIndex === 'PERSONAL' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                <BadgeDollarSign className="inline-block mr-2" size={18} /> Personal
              </button>
              <button onClick={() => setTabIndex('PRIVADO')} className={`px-4 py-2 font-medium ${tabIndex === 'PRIVADO' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                <Bus className="inline-block mr-2" size={18} /> Privado (Taxi)
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Fecha Planificada</span>
                <input type="date" name="fecha_salida" value={form.fecha_salida} onChange={handleChange} required className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none" />
              </label>
              
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Hora de Salida Planificada</span>
                <input type="time" name="hora_salida" value={form.hora_salida} onChange={handleChange} required className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none" />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Planta Origen</span>
                <select name="id_planta_origen" value={form.id_planta_origen} onChange={handleChange} required className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none bg-white">
                  <option value="" disabled>Seleccione una instalación</option>
                  {PLANTAS.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Planta Destino</span>
                <select name="id_planta_destino" value={form.id_planta_destino} onChange={handleChange} required className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none bg-white">
                  <option value="" disabled>Seleccione una instalación</option>
                  {PLANTAS.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </label>

              {tabIndex === 'EMPRESARIAL' && (
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-slate-700">ID Chofer Asignado</span>
                  <input type="text" name="id_chofer" value={form.id_chofer} onChange={handleChange} required className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none" placeholder="ID del colaborador que conduce" />
                </label>
              )}

              {(tabIndex === 'PERSONAL' || tabIndex === 'PRIVADO') && (
                <>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Monto Solicitado ($)</span>
                    <input type="number" step="0.01" name="monto_solicitado" value={form.monto_solicitado} onChange={handleChange} required className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none" placeholder="Ej: 5.50" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Evidencia de Costo</span>
                    <input type="text" name="evidencia_costo" value={form.evidencia_costo} onChange={handleChange} required className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none" placeholder="URL o nombre de archivo de la factura" />
                  </label>
                </>
              )}

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Motivo del Viaje</span>
                <textarea name="motivo_viaje" value={form.motivo_viaje} onChange={handleChange} required rows={2} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none" placeholder="Describe brevemente la razón del traslado" />
              </label>
              
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Observaciones (Opcional)</span>
                <textarea name="observaciones" value={form.observaciones} onChange={handleChange} rows={2} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none" placeholder="Cualquier información extra" />
              </label>

              <div className="md:col-span-2">
                <button type="submit" disabled={isGenerating} className="inline-flex items-center gap-2 rounded-xl bg-[#17243D] px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-[#223a5d]">
                  {isGenerating ? <LoaderCircle className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                  Solicitar Aprobación
                </button>
              </div>
            </form>
          </div>
        )}

        {/* HISTORIAL */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">
                {isAprobadasView ? 'Solicitudes Aprobadas' : 'Historial de Traslados'}
              </h3>
              <p className="text-sm text-slate-500">
                {isAprobadasView ? 'Viajes listos para ser escaneados en garita' : 'Listado inmutable para minería de procesos'}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-slate-500"><LoaderCircle className="animate-spin" size={18} /> Cargando...</div>
          ) : filteredTraslados.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
              No se encontraron registros de transporte.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Fecha/Hora</th>
                    <th className="px-4 py-3">Ruta</th>
                    <th className="px-4 py-3">Estado Actual</th>
                    <th className="px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTraslados.map((t) => (
                    <tr key={t.ID_Traslado} className="border-b border-slate-200">
                      <td className="px-4 py-3 font-semibold">{t.Tipo_Traslado}</td>
                      <td className="px-4 py-3 text-slate-600">{t.Fecha_Salida?.slice(0,10)} {t.Hora_Salida}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {PLANTAS.find(p => p.id == t.ID_Planta_Origen)?.nombre || `P. ${t.ID_Planta_Origen}`} {'->'} {PLANTAS.find(p => p.id == t.ID_Planta_Destino)?.nombre || `P. ${t.ID_Planta_Destino}`}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold bg-slate-100`}>
                          {t.Estado_Actual}
                        </span>
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                        {canApprove && (t.Estado_Actual === 'SOLICITADO' || t.Estado_Actual === 'PENDIENTE') && (
                          <button onClick={() => handleApprove(t.ID_Traslado, 'APROBADO_JEFE')} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                            Aprobar
                          </button>
                        )}
                        <button onClick={() => loadProgreso(t.ID_Traslado)} className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700">
                          Línea de Tiempo
                        </button>
                        {canSeeQr && t.Estado_Actual === 'APROBADO_JEFE' && (
                          <button onClick={() => setQrSeleccionado(t)} className="rounded-lg bg-[#17243D] px-3 py-1 text-xs font-semibold text-white">
                            Ver QR
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL PROGRESO PROCESS MINING */}
        {progresoSeleccionado && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl">
              <div className="flex justify-between border-b pb-3 mb-4">
                <h3 className="text-xl font-bold">Línea de Tiempo (Event Logs)</h3>
                <button onClick={() => setProgresoSeleccionado(null)} className="text-slate-500 hover:text-slate-800">Cerrar</button>
              </div>
              <div className="space-y-4">
                {progresoSeleccionado.map((evento, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-4 w-4 rounded-full bg-blue-600"></div>
                      {i !== progresoSeleccionado.length - 1 && <div className="h-full w-0.5 bg-slate-200 my-1"></div>}
                    </div>
                    <div className="pb-4">
                      <p className="font-semibold text-slate-800">{evento.Fase_Estado}</p>
                      <p className="text-xs text-slate-500">{new Date(evento.Timestamp_Evento).toLocaleString()} - Por: {evento.Actor || 'Sistema'}</p>
                      {evento.Detalles_Extra && (
                        <p className="text-sm mt-1 text-slate-600 bg-slate-50 p-2 rounded border">{evento.Detalles_Extra}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODAL QR */}
        {qrSeleccionado && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl text-center">
              <h3 className="text-xl font-bold mb-4">QR de Seguridad</h3>
              <div className="bg-white p-4 border rounded-xl inline-block shadow-inner mb-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${qrSeleccionado.ID_Traslado}`}
                  alt="QR"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-sm text-slate-500 break-words">{qrSeleccionado.ID_Traslado}</p>
              <button onClick={() => setQrSeleccionado(null)} className="mt-4 w-full rounded-lg bg-slate-200 py-2 font-medium">Cerrar</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default TransporteDashboard;
