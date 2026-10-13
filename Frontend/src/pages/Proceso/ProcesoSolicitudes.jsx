import { useEffect, useMemo, useState } from 'react';
import { LoaderCircle, Search, QrCode, X, ScanQrCode, Eye, Check, XCircle, ChevronDown } from 'lucide-react';
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
      requester: item.Solicitante_Nombre || item.NOMBRE || 'Sin solicitante',
      requesterId: item.ID_Solicitante || item.ID_Usuario || item.id_solicitante || item.id,
      area: item.Tipo_Traslado || 'Transporte',
      origin: item.Planta_Origen_Nombre || item.planta_origen_nombre || `Planta ${item.ID_Planta_Origen}`,
      destination: item.Planta_Destino_Nombre || item.planta_destino_nombre || `Planta ${item.ID_Planta_Destino}`,
      date: item.Fecha_Salida,
      reason: item.Motivo_Viaje || item.motivo_viaje || item.Motivo || item.motivo || 'Sin motivo indicado',
      status: normalizarEstado(item.Estado_Actual),
      qrToken: item.QR_Token || item.ID_Traslado,
    };
  }

  if (module === 'paqueteria') {
    return {
      id: item.ID_Paquete,
      code: `PAQ-${String(item.ID_Paquete).slice(0, 8).toUpperCase()}`,
      requester: item.responsable_nombre || item.nombre_solicitante || 'Sin responsable',
      requesterId: item.ID_Usuario || item.ID_Solicitante || item.ID_Responsable || item.id,
      area: item.area_destino_nombre || 'Paquetería',
      origin: item.planta_origen_nombre || 'Sin origen',
      destination: item.planta_destino_nombre || 'Sin destino',
      date: item.Fecha_Salida,
      reason: item.Comentario || item.comentario || item.Motivo || item.motivo || 'Sin motivo indicado',
      status: normalizarEstado(item.Estado_Actual),
      qrToken: item.qrToken || item.QR_Token || item.Token_QR || item.ID_Paquete,
    };
  }

  return {
    id: item.ID_Acceso,
    code: `EXT-${String(item.ID_Acceso).slice(0, 8).toUpperCase()}`,
    requester: item.empleado_nombre || item.nombre_solicitante || 'Sin solicitante',
    requesterId: item.ID_Empleado_Visitado || item.ID_Empleado || item.ID_Solicitante || item.ID_Usuario || item.id,
    provider: item.externo_nombre || 'Sin visitante',
    company: item.externo_empresa || 'Sin empresa',
    identification: item.externo_cedula || 'Sin cédula',
    phone: item.externo_telefono || 'Sin teléfono',
    area: item.Area_Visita || 'Acceso externo',
    origin: item.planta_origen_nombre || 'Sin origen',
    destination: item.planta_destino_nombre || 'Sin destino',
    date: item.Fecha_Visita,
    entryTime: item.Hora_Ingreso || 'Sin hora',
    exitTime: item.Hora_Salida || 'Sin hora',
    reason: item.Motivo || 'Sin motivo indicado',
    companions: Number(item.Numero_Acompanantes || 0),
    status: normalizarEstado(item.Estado_Actual),
    qrToken: item.QR_Token || null,
  };
};

const estadoEtiqueta = (estado) => {
  if (estado === 'Entrada registrada') return 'Entrada registrada';
  if (estado === 'En camino') return 'En camino';
  if (estado === 'Finalizado') return 'Finalizado';
  if (estado === 'Aprobado') return 'Aprobado';
  if (estado === 'Solicitado') return 'Solicitado';
  return estado || 'SIN ESTADO';
};

const estadoClase = (estado) => {
  if (estado === 'Entrada registrada') {
    return 'bg-amber-50 text-amber-700';
  }
  if (estado === 'En camino') {
    return 'bg-amber-50 text-amber-700';
  }
  if (estado === 'Aprobado' || estado === 'Finalizado') return 'bg-emerald-50 text-emerald-700';
  if (estado === 'Solicitado') return 'bg-blue-50 text-[#315b86]';
  return 'bg-blue-50 text-[#315b86]';
};

const normalizarEstado = (estado) => {
  return estado || 'Solicitado';
};

const ubicacionSolicitud = (item, modulo) => (
  modulo === 'externo' ? item.destination : `${item.origin} → ${item.destination}`
);

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
  const isJefe = userRole === 'jefe';
  const supervisorSoloTodas = isSupervisor && modulo !== 'paqueteria';
  const soloTodas = supervisorSoloTodas;
  const soloMis = false;

  // Mostrar filtros a supervisores y jefes
  const mostrarFiltrosScope = isSupervisor || (isJefe && modulo !== 'paqueteria');

  const config = MODULES[modulo] || MODULES.transporte;
  const [requests, setRequests] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('TODOS');
  const [scope, setScope] = useState('TODOS'); // 'TODOS' | 'MIS_SOLICITUDES'
  const [loading, setLoading] = useState(true);
  const [selectedQr, setSelectedQr] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [expandedRequestId, setExpandedRequestId] = useState(null);

  useEffect(() => {
    setScope(soloMis ? 'MIS_SOLICITUDES' : 'TODOS');
  }, [soloMis]);

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

  const handleApproval = async (request, accion) => {
    setApprovingId(request.id);
    try {
      const approvalBase = modulo === 'transporte' ? '/api/traslados/approve' : '/api/accesos/approve';
      const response = await fetch(`${API}${approvalBase}/${request.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ accion }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.msg || 'No se pudo procesar la solicitud');
      toast.success(accion === 'Aprobado' ? 'Solicitud aprobada y QR generado' : 'Solicitud rechazada');
      setSelectedRequest(null);
      await loadRequests();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setApprovingId(null);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [token, modulo, config.endpoint, config.responseKey]);

  const visibleRequests = useMemo(
    () => requests.filter((item) => item.status !== 'Finalizado'),
    [requests]
  );
  const statuses = useMemo(() => ['TODOS', ...new Set(visibleRequests.map((item) => item.status).filter(Boolean))], [visibleRequests]);

  const currentUserId = claims?.id || claims?.ID_Usuario || claims?.id_usuario;

  const filteredRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return visibleRequests.filter((item) => {
      const matchesQuery = !normalizedQuery || Object.values(item).some((value) => String(value || '').toLowerCase().includes(normalizedQuery));
      const matchesStatus = status === 'TODOS' || item.status === status;
      
      const matchesScope =
        soloTodas ||
        (soloMis && scope === 'MIS_SOLICITUDES') ||
        scope === 'TODOS' ||
        (scope === 'MIS_SOLICITUDES' && (
          String(item.requesterId) === String(currentUserId) ||
          String(item.requester).toLowerCase().includes(String(nombreUsuario).toLowerCase())
        ));

      return matchesQuery && matchesStatus && matchesScope;
    });
  }, [visibleRequests, query, status, scope, currentUserId, nombreUsuario, soloTodas, soloMis]);

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
          {isSupervisor && (modulo === 'paqueteria' || modulo === 'externo' || modulo === 'transporte') && (
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
          {mostrarFiltrosScope && (
            <div className="mb-5 flex flex-wrap gap-2.5">
              {!soloMis && <button
                onClick={() => setScope('TODOS')}
                className={`rounded-xl px-4 py-2 text-xs font-semibold shadow-sm transition-all ${
                  scope === 'TODOS'
                    ? 'bg-[#17243d] text-white'
                    : 'border border-slate-200 bg-blue-50/60 text-[#315b86] hover:bg-blue-100/70'
                }`}
              >
                Todas las Solicitudes
              </button>}
              {(soloMis || !soloTodas) && (
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
              )}
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
            <>
            <div className="mt-4 md:hidden">
              <div className="divide-y divide-slate-200 border-y border-slate-200">
                {filteredRequests.map((item) => {
                  const isExpanded = expandedRequestId === item.id;
                  return (
                    <div key={item.id} className="bg-white">
                      <button
                        type="button"
                        onClick={() => setExpandedRequestId(isExpanded ? null : item.id)}
                        className="flex w-full items-center gap-3 px-2 py-3 text-left"
                        aria-expanded={isExpanded}
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#17243d] text-white">
                          <ChevronDown size={15} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
                            <span className="font-semibold">Código</span>
                            <span className="font-semibold">Solicitante</span>
                          </span>
                          <span className="mt-1 flex items-start justify-between gap-3 text-[11px] text-[#17243d]">
                            <span className="font-bold">{item.code}</span>
                            <span className="truncate text-right">{item.requester}</span>
                          </span>
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="grid gap-2 bg-slate-50 px-11 pb-3 pr-3 text-[11px] text-slate-600">
                          <div className="grid grid-cols-2 gap-3">
                            <div><p className="text-[10px] font-semibold uppercase text-slate-400">{modulo === 'externo' ? 'Área / planta de visita' : 'Área / plantas'}</p><p>{item.area}</p><p>{ubicacionSolicitud(item, modulo)}</p></div>
                            <div><p className="text-[10px] font-semibold uppercase text-slate-400">Fecha</p><p>{String(item.date || '').slice(0, 10)}</p></div>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div><p className="text-[10px] font-semibold uppercase text-slate-400">Estado</p><span className={`inline-flex rounded-full px-2.5 py-1 font-semibold ${estadoClase(item.status)}`}>{estadoEtiqueta(item.status)}</span></div>
                            {!isSupervisor && (
                              <div className="flex flex-wrap justify-end gap-1.5">
                                {isJefe && <button onClick={() => setSelectedRequest(item)} className="rounded-lg border border-slate-200 bg-white p-1.5 text-[#315b86]" title="Ver datos"><Eye size={15} /></button>}
                                {isJefe && (modulo === 'transporte' || modulo === 'externo') && item.status === 'Solicitado' && (
                                  <>
                                    <button onClick={() => handleApproval(item, 'Aprobado')} disabled={approvingId === item.id} className="rounded-lg bg-[#315b86] p-1.5 text-white disabled:opacity-50" title="Aprobar"><Check size={15} /></button>
                                    <button onClick={() => handleApproval(item, 'RECHAZADO')} disabled={approvingId === item.id} className="rounded-lg border border-[#77a8d2] bg-[#e5effd] p-1.5 text-[#17243d] disabled:opacity-50" title="Rechazar"><XCircle size={15} /></button>
                                  </>
                                )}
                                {!isJefe && item.qrToken && (modulo === 'paqueteria' || item.status === 'Aprobado') && <button onClick={() => setSelectedQr({ code: item.code, token: item.qrToken, companions: item.companions })} className="rounded-lg border border-slate-200 bg-white p-1.5 text-[#17243d]" title="Ver Código QR"><QrCode size={15} /></button>}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 hidden overflow-x-auto md:block">
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
                        <div>{ubicacionSolicitud(item, modulo)}</div>
                        <div className="mt-1 text-[10px] text-slate-400">{item.area}</div>
                      </td>
                      <td className="px-3 py-4 text-slate-600">{String(item.date || '').slice(0, 10)}</td>
                      <td className="px-3 py-4">
                        <span className={`rounded-full px-3 py-1 font-semibold ${estadoClase(item.status)}`}>
                          {estadoEtiqueta(item.status)}
                        </span>
                      </td>

                      {/* No se renderiza la columna ni acciones si es Supervisor */}
                      {!isSupervisor && (
                        <td className="px-3 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {isJefe && <button
                              onClick={() => setSelectedRequest(item)}
                              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-[#315b86] transition hover:bg-[#e5effd]"
                              title="Ver datos"
                            >
                              <Eye size={15} />
                            </button>}
                            {isJefe && (modulo === 'transporte' || modulo === 'externo') && item.status === 'Solicitado' && (
                              <>
                                <button
                                  onClick={() => handleApproval(item, 'Aprobado')}
                                  disabled={approvingId === item.id}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#315b86] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#223a5d] disabled:opacity-50"
                                  title="Aprobar"
                                >
                                  <Check size={14} /> Aprobar
                                </button>
                                <button
                                  onClick={() => handleApproval(item, 'RECHAZADO')}
                                  disabled={approvingId === item.id}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#77a8d2] bg-[#e5effd] px-2.5 py-1.5 text-xs font-semibold text-[#17243d] transition hover:bg-[#cfe1f7] disabled:opacity-50"
                                  title="Rechazar"
                                >
                                  <XCircle size={14} /> Rechazar
                                </button>
                              </>
                            )}
                            {!isJefe && item.qrToken && (modulo === 'paqueteria' || item.status === 'Aprobado') && (
                              <button
                                onClick={() => setSelectedQr({ code: item.code, token: item.qrToken, companions: item.companions })}
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
            </>
          )}
        </section>
      </div>

      {/* Modal Emergente para Escanear QR */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <button
              onClick={() => setIsScannerOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={18} />
            </button>

            <h3 className="mb-4 text-lg font-bold text-[#17243d]">Escanear Código QR</h3>
            <div className="overflow-hidden rounded-xl bg-slate-50 p-2 border border-slate-100">
              <Escanear tipo={modulo} onClose={() => setIsScannerOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <button
              onClick={() => setSelectedRequest(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="Cerrar"
            >
              <X size={18} />
            </button>
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-[#e5effd] p-2.5 text-[#315b86]"><Eye size={20} /></div>
              <div>
                <h3 className="text-lg font-bold text-[#17243d]">Datos de la solicitud</h3>
                <p className="text-xs text-slate-500">{selectedRequest.code}</p>
              </div>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-xs font-semibold text-slate-400">Persona que solicita</dt><dd className="font-medium text-slate-700">{selectedRequest.requester}</dd></div>
              {modulo === 'externo' && <>
                <div><dt className="text-xs font-semibold text-slate-400">Proveedor / visitante</dt><dd className="font-medium text-slate-700">{selectedRequest.provider}</dd></div>
                <div><dt className="text-xs font-semibold text-slate-400">Empresa</dt><dd className="font-medium text-slate-700">{selectedRequest.company}</dd></div>
                <div><dt className="text-xs font-semibold text-slate-400">Cédula</dt><dd className="font-medium text-slate-700">{selectedRequest.identification}</dd></div>
                <div><dt className="text-xs font-semibold text-slate-400">Teléfono</dt><dd className="font-medium text-slate-700">{selectedRequest.phone}</dd></div>
              </>}
              <div><dt className="text-xs font-semibold text-slate-400">Estado</dt><dd className="font-medium text-slate-700">{estadoEtiqueta(selectedRequest.status)}</dd></div>
              <div><dt className="text-xs font-semibold text-slate-400">Destino</dt><dd className="font-medium text-slate-700">{selectedRequest.destination}</dd></div>
              <div><dt className="text-xs font-semibold text-slate-400">Área</dt><dd className="font-medium text-slate-700">{selectedRequest.area}</dd></div>
              <div><dt className="text-xs font-semibold text-slate-400">Fecha</dt><dd className="font-medium text-slate-700">{String(selectedRequest.date || '').slice(0, 10)}</dd></div>
              {modulo === 'externo' && <>
                <div><dt className="text-xs font-semibold text-slate-400">Hora de ingreso</dt><dd className="font-medium text-slate-700">{selectedRequest.entryTime}</dd></div>
                <div><dt className="text-xs font-semibold text-slate-400">Hora de salida</dt><dd className="font-medium text-slate-700">{selectedRequest.exitTime}</dd></div>
              </>}
              <div className="sm:col-span-2"><dt className="text-xs font-semibold text-slate-400">Motivo</dt><dd className="font-medium text-slate-700">{selectedRequest.reason || 'Sin motivo indicado'}</dd></div>
            </dl>
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
              {modulo === 'externo' && (
                <p className="mt-1 text-sm font-semibold text-[#17243d]">
                  Acompañantes: {selectedQr.companions}
                </p>
              )}

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