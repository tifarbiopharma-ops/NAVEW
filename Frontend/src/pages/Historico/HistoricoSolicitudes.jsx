import { useEffect, useMemo, useState } from 'react';
import { LoaderCircle, Search, ChevronDown, Receipt } from 'lucide-react';
import { toast } from 'react-toastify';
import { useParams } from 'react-router-dom';
import storeAuth from '../../context/storeAuth';
import { getAuthClaims } from '../../utils/authClaims';
import VerFactura from './VerFactura';

const API = import.meta.env.VITE_BACKEND_URL;

const MODULES = {
  transporte: {
    title: 'Histórico de Transporte',
    endpoint: '/api/traslados/historial',
    responseKey: 'traslados',
    empty: 'No hay solicitudes finalizadas de transporte.',
  },
  paqueteria: {
    title: 'Histórico de Paquetería',
    endpoint: '/api/envios/historial',
    responseKey: 'envios',
    empty: 'No hay solicitudes finalizadas de paquetería.',
  },
  externo: {
    title: 'Histórico de Externos',
    endpoint: '/api/accesos/historial',
    responseKey: 'accesos',
    empty: 'No hay solicitudes finalizadas de externos.',
  },
};

const isCompleted = (status) => {
  return status === 'Finalizado';
};

const normalizarEstado = (estado) => {
  return estado || 'Solicitado';
};

const ubicacionSolicitud = (item, modulo) => (
  modulo === 'externo' ? item.destination : `${item.origin} → ${item.destination}`
);

const normalizeRequest = (item, modulo) => {
  if (modulo === 'transporte') {
    return {
      id: item.ID_Traslado,
      code: `SAL-${String(item.ID_Traslado).slice(0, 8).toUpperCase()}`,
      requester: item.Solicitante_Nombre || 'Sin solicitante',
      requesterId: item.ID_Solicitante || item.ID_Usuario || item.id_solicitante || item.id,
      area: item.Tipo_Traslado || 'Transporte',
      origin: item.Planta_Origen_Nombre || item.planta_origen_nombre || `Planta ${item.ID_Planta_Origen}`,
      destination: item.Planta_Destino_Nombre || item.planta_destino_nombre || `Planta ${item.ID_Planta_Destino}`,
      date: item.Fecha_Salida,
      status: normalizarEstado(item.Estado_Actual),
      tieneFactura: Boolean(item.tieneFactura),
    };
  }

  if (modulo === 'paqueteria') {
    return {
      id: item.ID_Paquete,
      code: `PAQ-${String(item.ID_Paquete).slice(0, 8).toUpperCase()}`,
      requester: item.responsable_nombre || item.nombre_solicitante || 'Sin responsable',
      requesterId: item.ID_Usuario || item.ID_Solicitante || item.ID_Responsable || item.id,
      area: item.area_destino_nombre || 'Paquetería',
      recorridoAreas: `${item.area_origen_nombre || 'Sin área de origen'} → ${item.area_destino_nombre || 'Sin área de destino'}`,
      origin: item.planta_origen_nombre || 'Sin origen',
      destination: item.planta_destino_nombre || 'Sin destino',
      date: item.Fecha_Salida,
      status: normalizarEstado(item.Estado_Actual),
    };
  }

  return {
    id: item.ID_Acceso,
    code: `EXT-${String(item.ID_Acceso).slice(0, 8).toUpperCase()}`,
    requester: item.solicitante_nombre || item.nombre_solicitante || item.empleado_nombre || 'Sin solicitante',
    requesterId: item.ID_Solicitante ?? item.ID_Empleado ?? item.ID_Usuario ?? item.id,
    area: item.Area_Visita || 'Acceso externo',
    origin: item.planta_origen_nombre || 'Sin origen',
    destination: item.planta_destino_nombre || 'Sin destino',
    date: item.Fecha_Visita,
    status: normalizarEstado(item.Estado_Actual),
  };
};

const HistoricoSolicitudes = () => {
  const { modulo = 'transporte' } = useParams();
  const token = storeAuth((state) => state.token);
  const perfilUsuario = storeAuth((state) => state.user || state.usuario);

  const claims = token ? getAuthClaims(token) : null;
  const userRole = claims?.rol?.toLowerCase() || '';
  const nombreUsuario = perfilUsuario?.nombre || claims?.nombre || 'Usuario';
  const currentUserId = claims?.id || claims?.ID_Usuario || claims?.id_usuario;

  // Solo aplica filtros de scope en el módulo de paquetería
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
  const isJefe = rolesSuperiores.includes(rolActual);
  const supervisorSoloTodas = isSupervisor && modulo !== 'paqueteria';
  const soloTodas = supervisorSoloTodas;
  const mostrarFiltrosScope = isSupervisor || isJefe;
  // La factura la ven el solicitante, sus superiores y el administrador (no garita).
  const mostrarFacturas = modulo === 'transporte' && !isSupervisor;

  const config = MODULES[modulo] || MODULES.transporte;
  const [requests, setRequests] = useState([]);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('TODOS'); // 'TODOS' | 'MIS_SOLICITUDES'
  const [loading, setLoading] = useState(true);
  const [expandedRequestId, setExpandedRequestId] = useState(null);
  const [facturaDe, setFacturaDe] = useState(null);

  useEffect(() => {
    const loadHistory = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const response = await fetch(`${API}${config.endpoint}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.msg || 'No se pudo cargar el histórico');
        setRequests((data[config.responseKey] || [])
          .map((item) => normalizeRequest(item, modulo))
          .filter((item) => isCompleted(item.status)));
      } catch (error) {
        setRequests([]);
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [token, modulo, config.endpoint, config.responseKey]);

  const filteredRequests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return requests.filter((item) => {
      const matchesQuery = !normalizedQuery || Object.values(item).some((value) =>
        String(value || '').toLowerCase().includes(normalizedQuery)
      );

      const matchesScope =
        soloTodas ||
        !mostrarFiltrosScope ||
        scope === 'TODOS' ||
        (scope === 'MIS_SOLICITUDES' && (
          String(item.requesterId) === String(currentUserId) ||
          String(item.requester).toLowerCase().includes(String(nombreUsuario).toLowerCase())
        ));

      return matchesQuery && matchesScope;
    });
  }, [requests, query, scope, mostrarFiltrosScope, soloTodas, currentUserId, nombreUsuario]);

  return (
    <>
      <div className="min-h-full bg-fondo p-4 md:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-principal md:text-3xl">{config.title}</h1>
            <p className="mt-1 text-sm text-texto-muted">Consulta el historial de solicitudes completadas.</p>
          </div>

          <section className="rounded-2xl border border-borde bg-superficie p-5 shadow-sm md:p-6">
            <h2 className="text-base font-bold text-principal">Solicitudes finalizadas</h2>

            {/* Botones de filtro: solo en Paquetería */}
            {mostrarFiltrosScope && (
              <div className="mb-5 mt-4 flex flex-wrap gap-2.5">
                <button
                  onClick={() => setScope('TODOS')}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold shadow-sm transition-all ${
                    scope === 'TODOS'
                      ? 'bg-principal text-inverso'
                      : 'border border-borde bg-suave/60 text-acento hover:bg-suave-hover/70'
                  }`}
                >
                  Todas las Solicitudes
                </button>
                {!soloTodas && (
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

            <div className="mt-4">
              <label className="relative block">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-texto-muted" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por código o solicitante..."
                  className="w-full rounded-lg border border-borde bg-fondo py-2.5 pl-9 pr-3 text-sm outline-none focus:border-acento"
                />
              </label>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 py-12 text-sm text-texto-muted">
                <LoaderCircle className="animate-spin" size={18} /> Cargando histórico...
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
                          <div className="grid grid-cols-2 gap-3 bg-fondo px-11 pb-3 pr-3 text-[11px] text-texto-secundario">
                            <div><p className="text-[10px] font-semibold uppercase text-texto-muted">{modulo === 'externo' ? 'Área / planta de visita' : 'Área / plantas'}</p><p>{item.recorridoAreas || item.area}</p><p>{ubicacionSolicitud(item, modulo)}</p></div>
                            <div><p className="text-[10px] font-semibold uppercase text-texto-muted">Fecha</p><p>{String(item.date || '').slice(0, 10)}</p></div>
                            <div><p className="text-[10px] font-semibold uppercase text-texto-muted">Estado</p><span className="inline-flex rounded-full bg-exito-fondo px-2.5 py-1 font-semibold text-exito">Finalizado</span></div>
                            {mostrarFacturas && item.tieneFactura && (
                              <div className="flex items-end">
                                <button onClick={() => setFacturaDe(item)} className="inline-flex items-center gap-1.5 rounded-lg bg-acento px-2.5 py-1.5 font-semibold text-inverso" title="Ver factura">
                                  <Receipt size={14} /> Ver factura
                                </button>
                              </div>
                            )}
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
                      {mostrarFacturas && <th className="px-3 py-3 text-center">Factura</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((item) => (
                      <tr key={item.id} className="border-b border-borde-suave last:border-0">
                        <td className="px-3 py-4 font-bold text-principal">{item.code}</td>
                        <td className="px-3 py-4 text-texto-secundario">{item.requester}</td>
                        <td className="px-3 py-4 text-texto-secundario">
                          <div>{ubicacionSolicitud(item, modulo)}</div>
                          <div className="mt-1 text-[10px] text-texto-muted">{item.recorridoAreas || item.area}</div>
                        </td>
                        <td className="px-3 py-4 text-texto-secundario">{String(item.date || '').slice(0, 10)}</td>
                        <td className="px-3 py-4">
                          <span className="rounded-full bg-exito-fondo px-3 py-1 font-semibold text-exito">
                            Finalizado
                          </span>
                        </td>
                        {mostrarFacturas && (
                          <td className="px-3 py-4 text-center">
                            {item.tieneFactura ? (
                              <button
                                onClick={() => setFacturaDe(item)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-acento px-2.5 py-1.5 text-xs font-semibold text-inverso transition hover:bg-principal-hover"
                                title="Ver factura"
                              >
                                <Receipt size={14} /> Ver factura
                              </button>
                            ) : (
                              <span className="text-nav-texto">—</span>
                            )}
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
      </div>

      {facturaDe && (
        <VerFactura traslado={facturaDe} token={token} onClose={() => setFacturaDe(null)} />
      )}
    </>
  );
};

export default HistoricoSolicitudes;
