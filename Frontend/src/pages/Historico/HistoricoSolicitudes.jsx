import { useEffect, useMemo, useState } from 'react';
import { LoaderCircle, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import { useParams } from 'react-router-dom';
import storeAuth from '../../context/storeAuth';
import { getAuthClaims } from '../../utils/authClaims';

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
  const normalizedStatus = String(status || '').toUpperCase();
  return normalizedStatus.includes('FINALIZ')
    || normalizedStatus.includes('COMPLET')
    || normalizedStatus === 'ESCANEADO_DESTINO'
    || normalizedStatus === 'LLEGADA';
};

const normalizeRequest = (item, modulo) => {
  if (modulo === 'transporte') {
    return {
      id: item.ID_Traslado,
      code: `SAL-${String(item.ID_Traslado).slice(0, 8).toUpperCase()}`,
      requester: item.ID_Solicitante || 'Sin solicitante',
      requesterId: item.ID_Solicitante || item.ID_Usuario || item.id_solicitante || item.id,
      area: item.Tipo_Traslado || 'Transporte',
      destination: `Planta ${item.ID_Planta_Destino}`,
      date: item.Fecha_Salida,
      status: item.Estado_Actual,
    };
  }

  if (modulo === 'paqueteria') {
    return {
      id: item.ID_Paquete,
      code: `PAQ-${String(item.ID_Paquete).slice(0, 8).toUpperCase()}`,
      requester: item.responsable_nombre || item.nombre_solicitante || 'Sin responsable',
      requesterId: item.ID_Usuario || item.ID_Solicitante || item.ID_Responsable || item.id,
      area: item.area_destino_nombre || 'Paquetería',
      destination: item.planta_destino_nombre || 'Sin destino',
      date: item.Fecha_Salida,
      status: item.Estado_Actual,
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
  const mostrarFiltrosScope = modulo === 'paqueteria';

  const config = MODULES[modulo] || MODULES.transporte;
  const [requests, setRequests] = useState([]);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('TODOS'); // 'TODOS' | 'MIS_SOLICITUDES'
  const [loading, setLoading] = useState(true);

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
        !mostrarFiltrosScope ||
        scope === 'TODOS' ||
        (scope === 'MIS_SOLICITUDES' && (
          String(item.requesterId) === String(currentUserId) ||
          String(item.requester).toLowerCase().includes(String(nombreUsuario).toLowerCase())
        ));

      return matchesQuery && matchesScope;
    });
  }, [requests, query, scope, mostrarFiltrosScope, currentUserId, nombreUsuario]);

  return (
    <div className="min-h-full bg-[#f4f7fa] p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#718098]">Histórico</p>
          <h1 className="mt-2 text-2xl font-bold text-[#17243d] md:text-3xl">{config.title}</h1>
          <p className="mt-1 text-sm text-slate-500">Consulta el historial de solicitudes completadas.</p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-base font-bold text-[#17243d]">Solicitudes finalizadas</h2>

          {/* Botones de filtro: solo en Paquetería */}
          {mostrarFiltrosScope && (
            <div className="mb-5 mt-4 flex flex-wrap gap-2.5">
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

          <div className="mt-4">
            <label className="relative block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por código o solicitante..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#315b86]"
              />
            </label>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-12 text-sm text-slate-500">
              <LoaderCircle className="animate-spin" size={18} /> Cargando histórico...
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
                        <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                          Finalizado
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default HistoricoSolicitudes;