import { Link } from "react-router-dom";
import { ClipboardList, Globe2, Package, QrCode } from "lucide-react";

const ContextSidebar = ({ role, path, search }) => {
  const esSolicitante = role.includes("solicitante");
  const esJefe = role.includes("jefe");
  const esSupervisor = role.includes("supervisor");
  const mostrarSolicitudes = esSolicitante || esJefe || esSupervisor;

  if (!mostrarSolicitudes) return null;

  const esTransporte = path === "/dashboard/transporte" && !search.includes("view=aprobadas");
  const esValidarQr = path === "/dashboard/transporte/validar";
  const esProceso = path.startsWith("/dashboard/proceso/");
  const esHistorico = path.startsWith("/dashboard/historico/");
  const prefijoSeguimiento = esHistorico ? "historico" : "proceso";

  return (
    <aside className="hidden w-48.25 shrink-0 border-r border-[#e5eaf0] bg-white px-4 py-8 lg:block">
      <p className="mb-6 px-2 text-[10px] font-bold uppercase tracking-[0.04em] text-[#718098]">{esProceso ? "Proceso" : esHistorico ? "Histórico" : "Solicitud"}</p>
      <nav className="space-y-2">
        {(esProceso || esHistorico) && (
          <>
            <Link to={`/dashboard/${prefijoSeguimiento}/transporte`} className={`flex items-center gap-3 rounded-md px-3 py-3 text-xs font-bold transition ${path === `/dashboard/${prefijoSeguimiento}/transporte` ? "bg-[#e5effd] text-[#315b86]" : "text-[#4f5d70] hover:bg-slate-50"}`}>
              <ClipboardList size={14} />
              Transporte
            </Link>
            <Link to={`/dashboard/${prefijoSeguimiento}/paqueteria`} className={`flex items-center gap-3 rounded-md px-3 py-3 text-xs font-bold transition ${path === `/dashboard/${prefijoSeguimiento}/paqueteria` ? "bg-[#e5effd] text-[#315b86]" : "text-[#4f5d70] hover:bg-slate-50"}`}>
              <Package size={14} />
              Paquetería
            </Link>
            <Link to={`/dashboard/${prefijoSeguimiento}/externo`} className={`flex items-center gap-3 rounded-md px-3 py-3 text-xs font-bold transition ${path === `/dashboard/${prefijoSeguimiento}/externo` ? "bg-[#e5effd] text-[#315b86]" : "text-[#4f5d70] hover:bg-slate-50"}`}>
              <Globe2 size={14} />
              Externo
            </Link>
          </>
        )}
        {!esProceso && !esHistorico && (
          <>
        {(esSolicitante || esJefe) && (
          <Link
            to="/dashboard/transporte"
            className={`flex items-center gap-3 rounded-md px-3 py-3 text-xs font-bold transition ${
              esTransporte ? "bg-[#e5effd] text-[#315b86]" : "text-[#4f5d70] hover:bg-slate-50"
            }`}
          >
            <ClipboardList size={14} />
            Transporte
          </Link>
        )}
        <Link
          to="/dashboard/paqueteria"
          className={`flex items-center gap-3 rounded-md px-3 py-3 text-xs font-bold transition ${
            path === "/dashboard/paqueteria" ? "bg-[#e5effd] text-[#315b86]" : "text-[#4f5d70] hover:bg-slate-50"
          }`}
        >
          <Package size={14} />
          Paquetería
        </Link>
        <Link
          to="/dashboard/externo"
          className={`flex items-center gap-3 rounded-md px-3 py-3 text-xs font-bold transition ${
            path === "/dashboard/externo" ? "bg-[#e5effd] text-[#315b86]" : "text-[#4f5d70] hover:bg-slate-50"
          }`}
        >
          <Globe2 size={14} />
          Externo
        </Link>
        {esSupervisor && (
          <Link
            to="/dashboard/transporte/validar"
            className={`flex items-center gap-3 rounded-md px-3 py-3 text-xs font-bold transition ${
              esValidarQr ? "bg-[#e5effd] text-[#315b86]" : "text-[#4f5d70] hover:bg-slate-50"
            }`}
          >
            <QrCode size={14} />
            Validar QR
          </Link>
        )}
          </>
        )}
      </nav>
    </aside>
  );
};

export default ContextSidebar;