import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { QrCode, CheckCircle2, Search, LoaderCircle, BadgeCheck, MapPinned, PlusCircle } from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import storeAuth from '../../context/storeAuth';
import { getAuthClaims } from '../../utils/authClaims';

const API = import.meta.env.VITE_BACKEND_URL;

const SalidasDashboard = () => {
  const location = useLocation();
  const token = storeAuth((state) => state.token);
  const claims = getAuthClaims(token);
  const role = (claims?.rol || '').toLowerCase();
  const [salidas, setSalidas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    area_origen: '',
    destino: '',
    departamento: '',
    motivo: '',
    observaciones: '',
    fecha_salida: new Date().toISOString().slice(0, 10),
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrSeleccionado, setQrSeleccionado] = useState(null);

  const fetchSalidas = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/salidas/all`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data?.success) {
        setSalidas(data.salidas || []);
      }
    } catch (error) {
      console.error('Error al cargar salidas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalidas();
  }, [token]);

  const canCreateSalida = role.includes('solicitante') || role.includes('administrador');
  const canApprove = role.includes('jefe') || role.includes('administrador');
  const canSeeQr = role.includes('solicitante') || role.includes('jefe') || role.includes('administrador');
  const canValidateQr = role.includes('supervisor') || role.includes('administrador');
  const isSolicitante = role.includes('solicitante');
  const isSolicitanteAprobadasView = isSolicitante && new URLSearchParams(location.search).get('view') === 'aprobadas';
  const showFormSection = canCreateSalida && !canApprove && !isSolicitanteAprobadasView;
  const showTableSection = canApprove || isSolicitanteAprobadasView;
  const filteredSalidas = role.includes('jefe')
    ? salidas.filter((salida) => salida.estado === 'pendiente')
    : isSolicitanteAprobadasView
      ? salidas.filter((salida) => salida.estado === 'aprobado')
      : salidas;
  const ultimaSalidaAprobada = useMemo(
    () => filteredSalidas.find((salida) => salida.estado === 'aprobado') || null,
    [filteredSalidas],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!token) return;

    setIsGenerating(true);

    try {
      const response = await fetch(`${API}/api/salidas/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok || data?.success === false) {
        throw new Error(data?.msg || 'No se pudo registrar la salida');
      }

      toast.success('Solicitud creada correctamente. Ahora el jefe puede aprobarla.');
      setForm({
        area_origen: '',
        destino: '',
        departamento: '',
        motivo: '',
        observaciones: '',
        fecha_salida: new Date().toISOString().slice(0, 10),
      });
      await fetchSalidas();
    } catch (error) {
      toast.error(error.message || 'No se pudo registrar la salida.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async (id) => {
    if (!token) return;
    try {
      const response = await fetch(`${API}/api/salidas/approve/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok || data?.success === false) {
        throw new Error(data?.msg || 'No se pudo aprobar');
      }
      toast.success('Salida aprobada y QR habilitado para validación.');
      await fetchSalidas();
    } catch (error) {
      toast.error(error.message || 'No se pudo aprobar la salida.');
    }
  };

  const qrUrl = useMemo(() => {
    if (!qrSeleccionado || qrSeleccionado.estado !== 'aprobado') return null;

    const raw = qrSeleccionado.qr_payload;
    if (!raw) return null;

    try {
      const normalized = String(raw).trim();
      const decoded = (() => {
        try {
          return decodeURIComponent(normalized);
        } catch (error) {
          return normalized;
        }
      })();

      const parsed = JSON.parse(decoded);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (error) {
      // El QR puede venir como texto plano en formato compacto: FARBIO-SALIDA|...
    }

    try {
      const normalized = (() => {
        try {
          return decodeURIComponent(String(raw).trim());
        } catch (error) {
          return String(raw).trim();
        }
      })();

      const parts = normalized.split('|');
      if (parts[0] === 'FARBIO-SALIDA' && parts.length >= 12) {
        return {
          id: parts[1],
          codigo: parts[2],
          solicitante: parts[3],
          cedula: parts[4],
          area_origen: parts[5],
          destino: parts[6],
          departamento: parts[7],
          motivo: parts[8],
          fecha_salida: parts[9],
          estado: parts[10],
          aprobado_por: parts[11] || null,
        };
      }
    } catch (error) {
      console.error('Error parseando QR:', error);
    }

    return null;
  }, [qrSeleccionado]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <ToastContainer position="top-right" autoClose={4000} newestOnTop closeOnClick pauseOnHover />
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Control de salidas</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Registro y validación de salidas</h1>
          </div>
          <div className="flex gap-3">
            {canValidateQr && (
              <Link
                to="/dashboard/salidas/validar"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-medium text-slate-700 shadow-sm hover:bg-slate-100"
              >
                <Search size={18} />
                Validar QR
              </Link>
            )}
          </div>
        </div>

        {showFormSection && (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-[#17243D] p-2 text-white">
                <PlusCircle size={20} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Nueva solicitud de salida</h2>
                <p className="text-sm text-slate-500">Solicitante crea la orden y el jefe la aprueba.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-1">
                <span className="text-sm font-medium text-slate-700">Área de origen</span>
                <input name="area_origen" value={form.area_origen} onChange={handleChange} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-[#3d5a80]" placeholder="Ingrese la planta de origen" />
              </label>

              <label className="space-y-2 md:col-span-1">
                <span className="text-sm font-medium text-slate-700">Destino</span>
                <input name="destino" value={form.destino} onChange={handleChange} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-[#3d5a80]" placeholder="Ingrese la planta de destino" />
              </label>

              <label className="space-y-2 md:col-span-1">
                <span className="text-sm font-medium text-slate-700">Departamento</span>
                <input name="departamento" value={form.departamento} onChange={handleChange} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-[#3d5a80]" placeholder="Ingrese el departamento" />
              </label>

              <label className="space-y-2 md:col-span-1">
                <span className="text-sm font-medium text-slate-700">Fecha de salida</span>
                <input type="date" name="fecha_salida" value={form.fecha_salida} onChange={handleChange} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-[#3d5a80]" />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Motivo</span>
                <textarea name="motivo" value={form.motivo} onChange={handleChange} required rows={3} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-[#3d5a80]" placeholder="Entrega de documentos, materiales, personal, etc." />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Observaciones</span>
                <textarea name="observaciones" value={form.observaciones} onChange={handleChange} rows={3} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-[#3d5a80]" placeholder="Datos extra para la salida" />
              </label>

              <div className="md:col-span-2 flex items-center justify-between gap-3">
                <button type="submit" disabled={isGenerating} className="inline-flex items-center gap-2 rounded-xl bg-[#17243D] px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-[#223a5d] disabled:opacity-60">
                  {isGenerating ? <LoaderCircle className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                  {isGenerating ? 'Generando...' : 'Guardar orden'}
                </button>

              </div>
            </form>
          </div>
        )}

        {showTableSection && (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  {isSolicitanteAprobadasView ? 'Solicitudes aprobadas' : 'Solicitudes de salida'}
                </h3>
                <p className="text-sm text-slate-500">
                  {isSolicitanteAprobadasView ? 'Estado aprobatorio y acceso a QR' : 'Estado actual del flujo'}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 py-8 text-slate-500"><LoaderCircle className="animate-spin" size={18} /> Cargando...</div>
            ) : filteredSalidas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
                {isSolicitanteAprobadasView
                  ? 'No tienes solicitudes aprobadas aún.'
                  : role.includes('jefe') ? 'No hay solicitudes pendientes por aprobar.' : 'No hay solicitudes de salida registradas.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Código</th>
                      <th className="px-4 py-3 font-semibold">Solicitante</th>
                      <th className="px-4 py-3 font-semibold">Origen</th>
                      <th className="px-4 py-3 font-semibold">Destino</th>
                      <th className="px-4 py-3 font-semibold">Estado</th>
                      <th className="px-4 py-3 font-semibold">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSalidas.map((salida) => (
                      <tr key={salida.id} className="border-b border-slate-200 align-top">
                        <td className="px-4 py-3 font-semibold text-slate-900">{salida.codigo}</td>
                        <td className="px-4 py-3 text-slate-700">{salida.solicitante_nombre}</td>
                        <td className="px-4 py-3 text-slate-700">{salida.area_origen}</td>
                        <td className="px-4 py-3 text-slate-700">{salida.destino}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            salida.estado === 'aprobado' ? 'bg-emerald-100 text-emerald-700' :
                            salida.estado === 'entregado' ? 'bg-blue-100 text-blue-700' :
                            salida.estado === 'rechazado' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {salida.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {canApprove && salida.estado === 'pendiente' ? (
                            <button onClick={() => handleApprove(salida.id)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
                              Aprobar
                            </button>
                          ) : canSeeQr && salida.estado === 'aprobado' ? (
                            <button
                              onClick={() => setQrSeleccionado(salida)}
                              className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700"
                            >
                              Ver QR
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500">Sin acción</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {qrSeleccionado && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Código QR</p>
                  <h3 className="text-xl font-bold text-slate-900">{qrSeleccionado.codigo}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setQrSeleccionado(null)}
                  className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200"
                >
                  Cerrar
                </button>
              </div>

              {qrUrl ? (
                <div className="space-y-4">
                  <div className="mx-auto flex w-full max-w-65 items-center justify-center rounded-2xl bg-white p-4 shadow-inner ring-1 ring-slate-200">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=2&ecc=H&data=${encodeURIComponent(String(qrSeleccionado.qr_payload || JSON.stringify(qrUrl)))}`}
                      alt="QR de salida"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div className="text-center text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">{qrSeleccionado.destino}</p>
                    <p>{qrSeleccionado.departamento}</p>
                    <p className="mt-2 text-xs text-slate-500">{qrSeleccionado.motivo}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
                  No hay QR disponible para esta salida.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default SalidasDashboard;
