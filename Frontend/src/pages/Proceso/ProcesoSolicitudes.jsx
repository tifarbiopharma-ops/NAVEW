import { useEffect, useMemo, useState } from 'react';
import { LoaderCircle, Search, QrCode, X, ScanQrCode, Eye, Check, XCircle, ChevronDown, Receipt } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast, ToastContainer } from 'react-toastify';
import { useParams } from 'react-router-dom';
import storeAuth from '../../context/storeAuth';
import { getAuthClaims } from "../../utils/authClaims";

// Importación del escáner
import Escanear from '../Escaner/Escanear';
import SubirFactura from './SubirFactura';
import DetalleSolicitud from './DetalleSolicitud';

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
      puedeAprobar: Boolean(Number(item.puedeAprobar)),
      qrToken: item.QR_Token || item.ID_Traslado,
    };
  }

  if (module === 'paqueteria') {
    return {
      id: item.ID_Paquete,
      code: `PAQ-${String(item.ID_Paquete).slice(0, 8).toUpperCase()}`,
      requester: item.responsable_nombre || item.nombre_solicitante || 'Sin responsable',
      requesterId: item.ID_Responsable,
      area: item.area_destino_nombre || 'Paquetería',
      origin: item.planta_origen_nombre || 'Sin origen',
      destination: item.planta_destino_nombre || 'Sin destino',
      date: item.Fecha_Salida,
      reason: item.Comentario || item.comentario || item.Motivo || item.motivo || 'Sin motivo indicado',
      status: normalizarEstado(item.Estado_Actual),
      puedeAprobar: Boolean(Number(item.puedeAprobar)),
      qrToken: item.qrToken || item.QR_Token || item.Token_QR || item.ID_Paquete,
    };
  }

  return {
    id: item.ID_Acceso,
    code: `EXT-${String(item.ID_Acceso).slice(0, 8).toUpperCase()}`,
    requester: item.solicitante_nombre || item.nombre_solicitante || 'Sin solicitante identificado',
    requesterId: item.ID_Empleado_Visitado,
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
    puedeAprobar: Boolean(Number(item.puedeAprobar)),
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
  if (estado === 'Rechazado' || estado === 'Cancelado') {
    return 'bg-error-fondo text-error';
  }
  if (String(estado).startsWith('Pendiente')) {
    return 'bg-advertencia-fondo text-advertencia';
  }
  if (estado === 'Entrada registrada') {
    return 'bg-advertencia-fondo text-advertencia';
  }
  if (estado === 'En camino') {
    return 'bg-advertencia-fondo text-advertencia';
  }
  if (estado === 'Aprobado' || estado === 'Finalizado') return 'bg-exito-fondo text-exito';
  if (estado === 'Solicitado') return 'bg-suave text-acento';
  return 'bg-suave text-acento';
};

// 🔧 CAMBIO 3: normalizarEstado capitaliza (Solamente primera letra mayúscula)
const normalizarEstado = (estado) => {
  if (!estado) return 'Solicitado';
  const e = String(estado).trim();
  return e.charAt(0).toUpperCase() + e.slice(1).toLowerCase();
};

const ubicacionSolicitud = (item, modulo) => (
  modulo === 'externo' ? item.destination : `${item.origin} → ${item.destination}`
);

const ProcesoSolicitudes = () => {
  const { modulo = 'transporte' } = useParams();
  const token = storeAuth((state) => state.token);

  // Extracción segura de roles exactamente como indicaste
  const claims = token ? getAuthClaims(token) : null;
  const userRole = claims?.rol?.toLowerCase() || "";

  const rolActual = String(userRole || '').trim().toLowerCase();
  const rolesSuperiores = [
    'jefe',
    'subgerente',
    'gerente',
    'subgerentegeneral',
    'gerentegeneral',
    'presidente'
  ];

  const isSupervisor = userRole === 'supervisor';
  // Garita = quienes pueden escanear QR (mismo criterio que ROLES_GARITA en el backend)
  const puedeEscanear = isSupervisor || userRole === 'administrador';
  const isJefe = rolesSuperiores.includes(rolActual);
  // Cualquier otro rol (solicitante, encargado, etc.) → solo ve "Mis"
  const isSolicitante = !isSupervisor && !isJefe;

  // --- Supervisor ---
  // Solo "Todas" en Transporte/Externo; "Todas" y "Mis" en Paquetería
  const supervisorSoloTodas = isSupervisor && modulo !== 'paqueteria';

  // --- Jefe ---
  // Solo "Mis" en Paquetería
  const jefePaqueteriaSoloMis = isJefe && modulo === 'paqueteria';

  // --- scope forzado ---
  // Jefe y Solicitante en paquetería arrancan en "Mis"; el resto en "Todas"
  const soloTodas = supervisorSoloTodas;
  const soloMis = jefePaqueteriaSoloMis || isSolicitante;

  // --- visibilidad del bloque de filtros ---
  // Supervisor: siempre
  // Jefe: siempre
  // Solicitante: siempre (para mostrar solo el botón "Mis")
  const mostrarFiltrosScope = isSupervisor || isJefe || isSolicitante;


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
  const [facturaPara, setFacturaPara] = useState(null);
  const [expandedRequestId, setExpandedRequestId] = useState(null);
  const [miPerfil, setMiPerfil] = useState(null);

  useEffect(() => {
    if (!token) { setMiPerfil(null); return; }
    const controller = new AbortController();
    fetch(`${API}/api/users/mi-perfil`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    }).then(r => r.ok ? r.json() : Promise.reject(new Error('Error al consultar perfil')))
      .then(data => setMiPerfil(data.usuario ?? null))
      .catch(error => { if (error.name !== 'AbortError') console.error(error); });
    return () => controller.abort();
  }, [token]);

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

  const handleScannerClose = async () => {
    setIsScannerOpen(false);
    await loadRequests();
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

  const currentUserId = miPerfil?.idColaborador ?? miPerfil?.ID_COLABORADOR ?? null;

  // Solo quien solicitó un traslado privado sube su factura (el backend lo vuelve a validar).
  const puedeSubirFactura = (item) =>
    modulo === 'transporte' &&
    item.status === 'Pendiente factura' &&
    currentUserId != null &&
    String(item.requesterId) === String(currentUserId);

  const filteredRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return visibleRequests.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        Object.values(item).some((value) =>
          String(value ?? '').toLowerCase().includes(normalizedQuery)
        );

      const matchesStatus =
        status === 'TODOS' || item.status === status;

      // Verificar si la solicitud pertenece al usuario actual
      const esMiSolicitud =
        currentUserId != null &&
        item.requesterId != null &&
        String(item.requesterId) === String(currentUserId);

      // Jefe y solicitante: únicamente sus solicitudes
      // Supervisor: todas o las propias, según el filtro
      const matchesScope = soloMis
        ? esMiSolicitud
        : soloTodas || scope === 'TODOS' || esMiSolicitud;

      return matchesQuery && matchesStatus && matchesScope;
    });
    }, [
      visibleRequests,
      query,
      status,
      scope,
      currentUserId,
      soloTodas,
      soloMis,
    ]);

  return (
    <>
    <ToastContainer/>
      <div className="min-h-full bg-fondo p-4 md:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-texto-muted">
                Proceso {isSupervisor && '• Modo Supervisor'}
              </p>
              <h1 className="mt-2 text-2xl font-bold text-principal md:text-3xl">{config.title}</h1>
              <p className="mt-1 text-sm text-texto-muted">{config.subtitle}</p>
            </div>

            {/* Botón Escanear QR para garita (supervisor y administrador) */}
            {puedeEscanear && (modulo === 'paqueteria' || modulo === 'externo' || modulo === 'transporte') && (
              <div>
                <button
                  onClick={() => setIsScannerOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-principal px-4 py-2.5 text-sm font-semibold text-inverso shadow-sm transition hover:bg-principal-hover"
                >
                  <ScanQrCode size={18} />
                  <span>Escanear QR</span>
                </button>
              </div>
            )}
          </div>

          <section className="rounded-2xl border border-borde bg-superficie p-5 shadow-sm md:p-6">
            {/* Botones de filtro: solo supervisor */}
            {mostrarFiltrosScope && (
              <div className="mb-5 flex flex-wrap gap-2.5">
                {!soloMis && <button
                  onClick={() => setScope('TODOS')}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold shadow-sm transition-all ${
                    scope === 'TODOS'
                      ? 'bg-principal text-inverso'
                      : 'border border-borde bg-suave/60 text-acento hover:bg-suave-hover/70'
                  }`}
                >
                  Todas las Solicitudes
                </button>}
                {(soloMis || !soloTodas) && (
                  <button
                    onClick={() => setScope('MIS_SOLICITUDES')}
                    className={`rounded-xl px-4 py-2 text-xs font-semibold shadow-sm transition-all ${
                      scope === 'MIS_SOLICITUDES'
                        ? 'bg-principal text-inverso'
                        : 'border border-borde bg-suave/60 text-acento hover:bg-suave-hover/70'
                    }`}
                  >
                    Mis Solicitudes
                  </button>
                )}
              </div>
            )}

            <div className="mt-2 flex flex-col gap-3 md:flex-row">
              <label className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-texto-muted" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por código o solicitante..."
                  className="w-full rounded-lg border border-borde bg-fondo py-2.5 pl-9 pr-3 text-sm outline-none focus:border-acento"
                />
              </label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="rounded-lg border border-borde bg-fondo px-3 py-2.5 text-sm outline-none focus:border-acento md:w-44"
              >
                {statuses.map((option) => (
                  <option key={option} value={option}>
                    {option === 'TODOS' ? 'Todos los estados' : option}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 py-12 text-sm text-texto-muted">
                <LoaderCircle className="animate-spin" size={18} /> Cargando solicitudes...
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-borde bg-fondo p-10 text-center text-sm text-texto-muted">
                {config.empty}
              </div>
            ) : (
              <>
              <div className="mt-4 md:hidden">
                <div className="divide-y divide-borde border-y border-borde">
                  {filteredRequests.map((item) => {
                    const isExpanded = expandedRequestId === item.id;
                    return (
                      <div key={item.id} className="bg-superficie">
                        <button
                          type="button"
                          onClick={() => setExpandedRequestId(isExpanded ? null : item.id)}
                          className="flex w-full items-center gap-3 px-2 py-3 text-left"
                          aria-expanded={isExpanded}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-principal text-inverso">
                            <ChevronDown size={15} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2 text-[10px] text-texto-muted">
                              <span className="font-semibold">Código</span>
                              <span className="font-semibold">Solicitante</span>
                            </span>
                            <span className="mt-1 flex items-start justify-between gap-3 text-[11px] text-principal">
                              <span className="font-bold">{item.code}</span>
                              <span className="truncate text-right">{item.requester}</span>
                            </span>
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="grid gap-2 bg-fondo px-11 pb-3 pr-3 text-[11px] text-texto-secundario">
                            <div className="grid grid-cols-2 gap-3">
                              <div><p className="text-[10px] font-semibold uppercase text-texto-muted">{modulo === 'externo' ? 'Área / planta de visita' : 'Área / plantas'}</p><p>{item.area}</p><p>{ubicacionSolicitud(item, modulo)}</p></div>
                              <div><p className="text-[10px] font-semibold uppercase text-texto-muted">Fecha</p><p>{String(item.date || '').slice(0, 10)}</p></div>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <div><p className="text-[10px] font-semibold uppercase text-texto-muted">Estado</p><span className={`inline-flex rounded-full px-2.5 py-1 font-semibold ${estadoClase(item.status)}`}>{estadoEtiqueta(item.status)}</span></div>
                              {!isSupervisor && (
                                <div className="flex flex-wrap justify-end gap-1.5">
                                  {isJefe && <button onClick={() => setSelectedRequest(item)} className="rounded-lg border border-borde bg-superficie p-1.5 text-acento" title="Ver datos"><Eye size={15} /></button>}
                                  {(isJefe || userRole === 'administrador' || userRole === 'subgerentegeneral') && (modulo === 'transporte' || modulo === 'externo') && item.puedeAprobar && item.status === 'Solicitado' && (
                                    <>
                                      <button onClick={() => handleApproval(item, 'Aprobado')} disabled={approvingId === item.id} className="rounded-lg bg-acento p-1.5 text-inverso disabled:opacity-50" title="Aprobar"><Check size={15} /></button>
                                      <button onClick={() => handleApproval(item, 'Rechazado')} disabled={approvingId === item.id} className="rounded-lg border border-enfasis bg-suave p-1.5 text-principal disabled:opacity-50" title="Rechazar"><XCircle size={15} /></button>
                                    </>
                                  )}
                                  {!isJefe && item.qrToken && (modulo === 'paqueteria' || item.status === 'Aprobado') && <button onClick={() => setSelectedQr({ code: item.code, token: item.qrToken, companions: item.companions })} className="rounded-lg border border-borde bg-superficie p-1.5 text-principal" title="Ver Código QR"><QrCode size={15} /></button>}
                                  {puedeSubirFactura(item) && <button onClick={() => setFacturaPara(item)} className="rounded-lg bg-acento p-1.5 text-inverso" title="Subir factura"><Receipt size={15} /></button>}
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
                  <thead className="border-y border-borde bg-fondo text-[10px] uppercase text-texto-muted">
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
                      <tr key={item.id} className="border-b border-borde-suave last:border-0">
                        <td className="px-3 py-4 font-bold text-principal">{item.code}</td>
                        <td className="px-3 py-4 text-texto-secundario">{item.requester}</td>
                        <td className="px-3 py-4 text-texto-secundario">
                          <div>{ubicacionSolicitud(item, modulo)}</div>
                          <div className="mt-1 text-[10px] text-texto-muted">{item.area}</div>
                        </td>
                        <td className="px-3 py-4 text-texto-secundario">{String(item.date || '').slice(0, 10)}</td>
                        <td className="px-3 py-4">
                          <span className={`rounded-full px-3 py-1 font-semibold ${estadoClase(item.status)}`}>
                            {estadoEtiqueta(item.status)}
                          </span>
                        </td>

                        {!isSupervisor && (
                          <td className="px-3 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {isJefe && <button
                                onClick={() => setSelectedRequest(item)}
                                className="inline-flex items-center justify-center rounded-lg border border-borde bg-fondo p-1.5 text-acento transition hover:bg-suave"
                                title="Ver datos"
                              >
                                <Eye size={15} />
                              </button>}
                              {(isJefe || userRole === 'administrador' || userRole === 'subgerentegeneral') && (modulo === 'transporte' || modulo === 'externo') && item.puedeAprobar && item.status === 'Solicitado' && (
                                <>
                                  <button
                                    onClick={() => handleApproval(item, 'Aprobado')}
                                    disabled={approvingId === item.id}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-acento px-2.5 py-1.5 text-xs font-semibold text-inverso transition hover:bg-principal-hover disabled:opacity-50"
                                    title="Aprobar"
                                  >
                                    <Check size={14} /> Aprobar
                                  </button>
                                  <button
                                    onClick={() => handleApproval(item, 'Rechazado')}
                                    disabled={approvingId === item.id}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-enfasis bg-suave px-2.5 py-1.5 text-xs font-semibold text-principal transition hover:bg-suave-hover disabled:opacity-50"
                                    title="Rechazar"
                                  >
                                    <XCircle size={14} /> Rechazar
                                  </button>
                                </>
                              )}
                              {!isJefe && item.qrToken && (modulo === 'paqueteria' || item.status === 'Aprobado') && (
                                <button
                                  onClick={() => setSelectedQr({ code: item.code, token: item.qrToken, companions: item.companions })}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-borde bg-fondo px-2.5 py-1.5 font-semibold text-principal transition hover:bg-principal hover:text-inverso"
                                  title="Ver Código QR"
                                >
                                  <QrCode size={14} />
                                  <span>Ver QR</span>
                                </button>
                              )}
                              {puedeSubirFactura(item) && (
                                <button
                                  onClick={() => setFacturaPara(item)}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-acento px-2.5 py-1.5 text-xs font-semibold text-inverso transition hover:bg-principal-hover"
                                  title="Subir factura"
                                >
                                  <Receipt size={14} /> Subir factura
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

        {/* Modal Escanear QR */}
        {isScannerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-principal/50 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl rounded-2xl border border-borde bg-superficie p-6 shadow-xl">
              <button
                onClick={() => setIsScannerOpen(false)}
                className="absolute right-4 top-4 rounded-lg p-1 text-texto-muted hover:bg-superficie-muted hover:text-texto-secundario"
              >
                <X size={18} />
              </button>

              <h3 className="mb-4 text-lg font-bold text-principal">Escanear Código QR</h3>
              <div className="overflow-hidden rounded-xl bg-fondo p-2 border border-borde-suave">
                <Escanear tipo={modulo} onClose={handleScannerClose} />
              </div>
            </div>
          </div>
        )}

        {facturaPara && (
          <SubirFactura
            traslado={facturaPara}
            token={token}
            onClose={() => setFacturaPara(null)}
            onFinalizado={() => {
              setFacturaPara(null);
              loadRequests();
            }}
          />
        )}

        {selectedRequest && (
          <DetalleSolicitud
            solicitud={selectedRequest}
            modulo={modulo}
            estadoTexto={estadoEtiqueta(selectedRequest.status)}
            claseEstado={estadoClase(selectedRequest.status)}
            onClose={() => setSelectedRequest(null)}
          />
        )}

        {selectedQr && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-principal/40 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-sm rounded-2xl border border-borde bg-superficie p-6 shadow-xl transition-all">
              <button
                onClick={() => setSelectedQr(null)}
                className="absolute right-4 top-4 rounded-lg p-1 text-texto-muted hover:bg-superficie-muted hover:text-texto-secundario"
              >
                <X size={18} />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="mb-2 rounded-xl bg-principal p-2.5 text-inverso">
                  <QrCode size={20} />
                </div>
                <h3 className="text-lg font-bold text-principal">Código QR de Solicitud</h3>
                <p className="text-xs font-semibold text-acento">{selectedQr.code}</p>
                {modulo === 'externo' && (
                  <p className="mt-1 text-sm font-semibold text-principal">
                    Acompañantes: {selectedQr.companions}
                  </p>
                )}

                <div className="my-5 rounded-xl border border-borde-suave bg-fondo p-4 shadow-inner">
                  <QRCodeSVG value={selectedQr.token} size={200} level="H" includeMargin />
                </div>

                <p className="max-w-xs break-all text-[11px] text-texto-muted">{selectedQr.token}</p>

                <button
                  onClick={() => setSelectedQr(null)}
                  className="mt-5 w-full rounded-lg bg-principal py-2 text-sm font-semibold text-inverso transition hover:bg-principal-hover"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ProcesoSolicitudes;
