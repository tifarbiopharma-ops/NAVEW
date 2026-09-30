import { useEffect, useMemo, useState } from 'react';
import { LoaderCircle, Search, QrCode, X, ScanQrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-toastify';
import { useParams } from 'react-router-dom';
import storeAuth from '../../context/storeAuth';
import { getAuthClaims } from "../../utils/authClaims";

// Importación del escáner
import Escanear from '../Escaner/Escanear';

const API = import.meta.env.VITE_BACKEND_URL;

const MODULES = {
  transporte: {
    title: 'Seguimiento de solicitudes',
    subtitle: 'Consulta el estado y avance de las solicitudes de transporte.',
    endpoint: '/api/traslados/historial',
    responseKey: 'traslados',
    empty: 'No hay solicitudes de transporte creadas.',
  },
  paqueteria: {
    title: 'Seguimiento de solicitudes',
    subtitle: 'Consulta el estado de las solicitudes de paquetería.',
    endpoint: '/api/envios/historial',
    responseKey: 'envios',
    empty: 'No hay solicitudes de paquetería creadas.',
  },
  externo: {
    title: 'Seguimiento de solicitudes',
    subtitle: 'Consulta el estado de las solicitudes de acceso externo.',
    endpoint: '/api/accesos/historial',
    responseKey: 'accesos',
    empty: 'No hay solicitudes de acceso externo creadas.',
  },
};

const normalizeRequest = (item, module) => {
  if (module === 'transporte') {
    return {
      id: item.ID_Traslado,
      code: `SAL-${String(item.ID_Traslado).slice(0, 8).toUpperCase()}`,
      requester: item.ID_Solicitante || 'Sin solicitante',
      requesterId: item.ID_Solicitante || item.ID_Usuario || item.id_solicitante || item.id,
      area: item.Tipo_Traslado || 'Transporte',
      destination: `Planta ${item.ID_Planta_Destino}`,
      date: item.Fecha_Salida,
      status: item.Estado_Actual,
      qrToken: null,
    };
  }

  if (module === 'paqueteria') {
    return {
      id: item.ID_Paquete,
      code: `PAQ-${String(item.ID_Paquete).slice(0, 8).toUpperCase()}`,
      requester: item.responsable_nombre || item.nombre_solicitante || 'Sin responsable',
      requesterId: item.ID_Usuario || item.ID_Solicitante || item.ID_Responsable || item.id,
      area: item.area_destino_nombre || 'Paquetería',
      destination: item.planta_destino_nombre || 'Sin destino',
      date: item.Fecha_Salida,
      status: item.Estado_Actual,
      qrToken: item.qrToken || item.Token_QR || item.ID_Paquete,
    };
  }

  return {
    id: item.ID_Acceso,
    code: `EXT-${String(item.ID_Acceso).slice(0, 8).toUpperCase()}`,
    requester: item.empleado_nombre || item.nombre_solicitante || 'Sin solicitante',
    requesterId: item.ID_Empleado || item.ID_Solicitante || item.ID_Usuario || item.id,
    area: item.Area_Visita || 'Acceso externo',
    destination: item.planta_destino_nombre || 'Sin destino',
    date: item.Fecha_Visita,
    status: item.Estado_Actual,
    qrToken: null,
  };
};

const ProcesoSolicitudes = () => {
  const { modulo = 'transporte' } = useParams();
  const token = storeAuth((state) => state.token);
  const perfilUsuario = storeAuth((state) => state.user || state.usuario);

  // Extracción segura de roles exactamente como indicaste
  const claims = token ? getAuthClaims(token) : null;
  const userRole = claims?.rol?.toLowerCase() || "";
  const nombreUsuario = perfilUsuario?.nombre || claims?.nombre || "Usuario";

  // Verificación del rol de Supervisor
  const isSupervisor = userRole === 'supervisor';

  const config = MODULES[modulo] || MODULES.transporte;
  const [requests, setRequests] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('TODOS');
  const [scope, setScope] = useState('TODOS'); // 'TODOS' | 'MIS_SOLICITUDES'
  const [loading, setLoading] = useState(true);
  const [selectedQr, setSelectedQr] = useState(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const loadRequests = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch(`${API}${config.endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.msg || 'No se pudieron cargar las solicitudes');
      const normalizedRequests = (data[config.responseKey] || []).map((item) => normalizeRequest(item, modulo));
      setRequests(normalizedRequests);
    } catch (error) {
      setRequests([]);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [token, modulo, config.endpoint, config.responseKey]);

  const statuses = useMemo(() => ['TODOS', ...new Set(requests.map((item) => item.status).filter(Boolean))], [requests]);

  const currentUserId = claims?.id || claims?.ID_Usuario || claims?.id_usuario;

  const filteredRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return requests.filter((item) => {
      const matchesQuery = !normalizedQuery || Object.values(item).some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
      const matchesStatus = status === 'TODOS' || item.status === status;
      
      const matchesScope =
        scope === 'TODOS' ||
        (scope === 'MIS_SOLICITUDES' && (
          String(item.requesterId) === String(currentUserId) ||
          String(item.requester).toLowerCase().includes(String(nombreUsuario).toLowerCase())
        ));

      return matchesQuery && matchesStatus && matchesScope;
    });
  }, [requests, query, status, scope, currentUserId, nombreUsuario]);

  return (
    <div className="min-h-full bg-[#f4f7fa] p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#718098]">
              Proceso {isSupervisor && '• Modo Supervisor'}
            </p>
            <h1 className="mt-2 text-2xl font-bold text-[#17243d] md:text-3xl">{config.title}</h1>
            <p className="mt-1 text-sm text-slate-500">{config.subtitle}</p>
          </div>

          {/* Botón Escanear QR para Supervisor en Paquetería y Externo */}
          {isSupervisor && (modulo === 'paqueteria' || modulo === 'externo') && (
            <div>
              <button
                onClick={() => setIsScannerOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#17243d] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#223a5d]"
              >
                <ScanQrCode size={18} />
                <span>Escanear QR</span>
              </button>
            </div>
          )}
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          {/* Botones Azules de Filtro "Todas las Solicitudes" y "Mis Solicitudes" */}
          {isSupervisor && (
            <div className="mb-5 flex flex-wrap gap-2.5">
              <button
                onClick={() => setScope('TODOS')}
                className={`rounded-xl px-4 py-2 text-xs font-semibold shadow-sm transition-all ${
                  scope === 'TODOS'
                    ? 'bg-[#17243d] text-white'
                    : 'border border-slate-200 bg-blue-50/60 text-[#315b86] hover:bg-blue-100/70'
                }`}
              >
                Todas las Solicitudes
              </button>
              <button
                onClick={() => setScope('MIS_SOLICITUDES')}
                className={`rounded-xl px-4 py-2 text-xs font-semibold shadow-sm transition-all ${
                  scope === 'MIS_SOLICITUDES'
                    ? 'bg-[#17243d] text-white'
                    : 'border border-slate-200 bg-blue-50/60 text-[#315b86] hover:bg-blue-100/70'
                }`}
              >
                Mis Solicitudes
              </button>
            </div>
          )}

          <div className="mt-2 flex flex-col gap-3 md:flex-row">
            <label className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por código o solicitante..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#315b86]"
              />
            </label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#315b86] md:w-44"
            >
              {statuses.map((option) => (
                <option key={option} value={option}>
                  {option === 'TODOS' ? 'Todos los estados' : option}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-12 text-sm text-slate-500">
              <LoaderCircle className="animate-spin" size={18} /> Cargando solicitudes...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
              {config.empty}
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="border-y border-slate-200 bg-slate-50 text-[10px] uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-3">Código</th>
                    <th className="px-3 py-3">Solicitante</th>
                    <th className="px-3 py-3">Área / Destino</th>
                    <th className="px-3 py-3">Fecha</th>
                    <th className="px-3 py-3">Estado</th>
                    {!isSupervisor && <th className="px-3 py-3 text-center">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-4 font-bold text-[#17243d]">{item.code}</td>
                      <td className="px-3 py-4 text-slate-600">{item.requester}</td>
                      <td className="px-3 py-4 text-slate-600">
                        <div>{item.destination}</div>
                        <div className="mt-1 text-[10px] text-slate-400">{item.area}</div>
                      </td>
                      <td className="px-3 py-4 text-slate-600">{String(item.date || '').slice(0, 10)}</td>
                      <td className="px-3 py-4">
                        <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-[#315b86]">
                          {item.status || 'SIN ESTADO'}
                        </span>
                      </td>

                      {/* No se renderiza la columna ni acciones si es Supervisor */}
                      {!isSupervisor && (
                        <td className="px-3 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {modulo === 'paqueteria' && item.qrToken && (
                              <button
                                onClick={() => setSelectedQr({ code: item.code, token: item.qrToken })}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-semibold text-[#17243d] transition hover:bg-[#17243d] hover:text-white"
                                title="Ver Código QR"
                              >
                                <QrCode size={14} />
                                <span>Ver QR</span>
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Modal Emergente para Escanear QR */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <button
              onClick={() => setIsScannerOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={18} />
            </button>

            <h3 className="mb-4 text-lg font-bold text-[#17243d]">Escanear Código QR</h3>
            <div className="overflow-hidden rounded-xl bg-slate-50 p-2 border border-slate-100">
              <Escanear onClose={() => setIsScannerOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Modal Emergente para Mostrar el QR */}
      {selectedQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl transition-all">
            <button
              onClick={() => setSelectedQr(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="mb-2 rounded-xl bg-[#17243d] p-2.5 text-white">
                <QrCode size={20} />
              </div>
              <h3 className="text-lg font-bold text-[#17243d]">Código QR de Solicitud</h3>
              <p className="text-xs font-semibold text-[#315b86]">{selectedQr.code}</p>

              <div className="my-5 rounded-xl border border-slate-100 bg-slate-50 p-4 shadow-inner">
                <QRCodeSVG value={selectedQr.token} size={200} level="H" includeMargin />
              </div>

              <p className="max-w-xs break-all text-[11px] text-slate-400">{selectedQr.token}</p>

              <button
                onClick={() => setSelectedQr(null)}
                className="mt-5 w-full rounded-lg bg-[#17243d] py-2 text-sm font-semibold text-white transition hover:bg-[#223a5d]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcesoSolicitudes;