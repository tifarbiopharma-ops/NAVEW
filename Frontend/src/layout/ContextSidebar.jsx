import { Link } from "react-router-dom";
import { ClipboardList, Globe2, Package } from "lucide-react";

const ContextSidebar = ({ role, path, search, mobileMenuOpen, sidebarCollapsed, onNavigate }) => {
  const rolActual = String(role || "").trim().toLowerCase();
  const esSolicitante = role.includes("solicitante");
  const rolesSuperiores = [
    "jefe",
    "subgerente",
    "gerente",
    "subgerentegeneral",
    "gerentegeneral",
    "presidente"
  ];

  const esJefe = rolesSuperiores.includes(rolActual);
  const esSupervisor = role.includes("supervisor");
  const mostrarSolicitudes = esSolicitante || esJefe || esSupervisor;

  if (!mostrarSolicitudes) return null;

  const esTransporte = path === "/dashboard/transporte" && !search.includes("view=aprobadas");
  const esProceso = path.startsWith("/dashboard/proceso/");
  const esHistorico = path.startsWith("/dashboard/historico/");
  const prefijoSeguimiento = esHistorico ? "historico" : "proceso";

  return (
    <aside className={`z-40 w-36 shrink-0 border-r border-borde bg-superficie px-2 py-5 transition-all duration-300 lg:static lg:block lg:w-48.25 lg:px-4 lg:py-8 ${
      mobileMenuOpen
        ? `fixed bottom-0 top-0 block ${sidebarCollapsed ? "left-16" : "left-[102px]"}`
        : `fixed bottom-0 top-0 hidden ${sidebarCollapsed ? "left-16" : "left-[102px]"} lg:static lg:block`
    }`}>
      <nav aria-label="Módulos de solicitudes" className="space-y-2">
        {(esProceso || esHistorico) && (
          <>
            <Link
              to={`/dashboard/${prefijoSeguimiento}/transporte`}
              onClick={onNavigate}
              className={`flex items-center gap-2 rounded-md px-2 py-2.5 text-[10px] font-bold transition lg:gap-3 lg:px-3 lg:py-3 lg:text-xs ${
                path === `/dashboard/${prefijoSeguimiento}/transporte`
                  ? "bg-suave text-acento"
                  : "text-texto-secundario hover:bg-fondo"
              }`}
            >
              <ClipboardList size={14} />
              Transporte
            </Link>
            <Link
              to={`/dashboard/${prefijoSeguimiento}/paqueteria`}
              onClick={onNavigate}
              className={`flex items-center gap-2 rounded-md px-2 py-2.5 text-[10px] font-bold transition lg:gap-3 lg:px-3 lg:py-3 lg:text-xs ${
                path === `/dashboard/${prefijoSeguimiento}/paqueteria`
                  ? "bg-suave text-acento"
                  : "text-texto-secundario hover:bg-fondo"
              }`}
            >
              <Package size={14} />
              Paquetería
            </Link>
            <Link
              to={`/dashboard/${prefijoSeguimiento}/externo`}
              onClick={onNavigate}
              className={`flex items-center gap-2 rounded-md px-2 py-2.5 text-[10px] font-bold transition lg:gap-3 lg:px-3 lg:py-3 lg:text-xs ${
                path === `/dashboard/${prefijoSeguimiento}/externo`
                  ? "bg-suave text-acento"
                  : "text-texto-secundario hover:bg-fondo"
              }`}
            >
              <Globe2 size={14} />
              Externo
            </Link>
          </>
        )}

        {!esProceso && !esHistorico && (
          <>
            {/* Transporte: solo solicitante o jefe (NO supervisor) */}
            {(esSolicitante || esJefe) && (
              <Link
                to="/dashboard/transporte"
                onClick={onNavigate}
                className={`flex items-center gap-2 rounded-md px-2 py-2.5 text-[10px] font-bold transition lg:gap-3 lg:px-3 lg:py-3 lg:text-xs ${
                  esTransporte
                    ? "bg-suave text-acento"
                    : "text-texto-secundario hover:bg-fondo"
                }`}
              >
                <ClipboardList size={14} />
                Transporte
              </Link>
            )}

            {/* Paquetería: visible para solicitante, jefe y supervisor */}
            <Link
              to="/dashboard/paqueteria"
              onClick={onNavigate}
              className={`flex items-center gap-2 rounded-md px-2 py-2.5 text-[10px] font-bold transition lg:gap-3 lg:px-3 lg:py-3 lg:text-xs ${
                path === "/dashboard/paqueteria"
                  ? "bg-suave text-acento"
                  : "text-texto-secundario hover:bg-fondo"
              }`}
            >
              <Package size={14} />
              Paquetería
            </Link>

            {/* Externo: solo solicitante o jefe (NO supervisor) */}
            {(esSolicitante || esJefe ) && (
              <Link
                to="/dashboard/externo"
                onClick={onNavigate}
                className={`flex items-center gap-2 rounded-md px-2 py-2.5 text-[10px] font-bold transition lg:gap-3 lg:px-3 lg:py-3 lg:text-xs ${
                  path === "/dashboard/externo"
                    ? "bg-suave text-acento"
                    : "text-texto-secundario hover:bg-fondo"
                }`}
              >
                <Globe2 size={14} />
                Externo
              </Link>
            )}

            {/* Validar QR: eliminado para supervisor */}
          </>
        )}
      </nav>
    </aside>
  );
};

export default ContextSidebar;
