import { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import storeAuth from "../context/storeAuth";
import useFetch from "../hooks/useFetch";
import { getAuthClaims } from "../utils/authClaims";
import { ChevronRight, ClipboardList, History, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Users, Workflow, X } from "lucide-react";
import ContextSidebar from "./ContextSidebar";
import TopBar from "./TopBar";
import { Truck } from "lucide-react";
import AvisarLlegada from "../pages/Notis/notis";

export const ROLES_SUPERIORES = new Set([
  'jefe',
  'subgerente',
  'gerente',
  'subgerentegeneral',
  'gerentegeneral',
  'presidente'
]);

export const esRolSuperior = (rol) =>
  ROLES_SUPERIORES.has(
    String(rol || '').trim().toLowerCase()
  );

const Dashboard = () => {
  const location = useLocation();
  const urlActual = location.pathname;
  const { logout, token } = storeAuth();
  const { fetchDataBackend } = useFetch();

  const [perfilUsuario, setPerfilUsuario] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(() => (
    typeof window !== "undefined" && window.innerWidth < 768
  ));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Extracción segura de roles
  const claims = token ? getAuthClaims(token) : null;
  const userRole = claims?.rol?.toLowerCase() || "";
  const nombreUsuario = perfilUsuario?.nombre || claims?.nombre || "Usuario";

  const esAdministrador = userRole === "administrador";
  const esSupervisor = userRole === "supervisor";
  const [modalLlegadaAbierto, setModalLlegadaAbierto] = useState(false);
  

  const tituloSeccion = urlActual.startsWith("/dashboard/admin")
    ? "Administración"
    : urlActual.startsWith("/dashboard/proceso")
      ? "Proceso"
    : urlActual.startsWith("/dashboard/historico")
      ? "Histórico"
    : urlActual.startsWith("/dashboard/transporte")
      ? "Solicitud"
      : "Panel principal";

  // Cargar perfil del usuario de forma segura
  useEffect(() => {
    let isMounted = true;

    const cargarDatosUsuario = async () => {
      if (!token) {
        if (isMounted) setPerfilUsuario(null);
        return;
      }

      try {
        const url = `${import.meta.env.VITE_BACKEND_URL}/api/users/mi-perfil`;
        const response = await fetchDataBackend(url, null, "GET", token, false);
        if (isMounted && response?.usuario) {
          setPerfilUsuario(response.usuario);
        }
      } catch (error) {
        console.error("Error al cargar perfil de usuario:", error);
      }
    };

    cargarDatosUsuario();

    return () => {
      isMounted = false;
    };
  }, [token, fetchDataBackend]);

  // Manejo de Logout seguro
  const handleLogout = () => {
    setPerfilUsuario(null);
    window.dispatchEvent(new Event("auth:logout"));
    logout();
    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
  };

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);
  const handleMenuItemClick = () => setMobileMenuOpen(false);

  useEffect(() => {
    const handleViewportChange = () => {
      if (window.innerWidth >= 768) {
        setIsCollapsed(false);
      }
    };

    handleViewportChange();
    window.addEventListener("resize", handleViewportChange);
    return () => window.removeEventListener("resize", handleViewportChange);
  }, []);

  function getHDImage(url) {
    if (!url) return url;
    if (url.includes("googleusercontent.com") || url.includes("gstatic.com")) {
      return url.replace(/=s\d+/, "=s1024");
    }
    return url;
  }

  // Carga de fuente externa
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Gowun+Batang&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);

  const navItemClass = (active) => `group flex items-center gap-1 rounded-md px-1.5 py-2 text-[9px] transition md:gap-3 md:px-3 md:py-3 md:text-sm [&>svg]:h-3 [&>svg]:w-3 md:[&>svg]:h-[18px] md:[&>svg]:w-[18px] ${
    active ? "bg-acento font-bold text-inverso" : "text-nav-texto hover:bg-principal-hover hover:text-inverso"
  } ${isCollapsed ? "justify-center" : ""}`;

  return (
    <div className="flex h-screen flex-col bg-fondo font-sans text-principal md:flex-row">
      
      {/* HEADER MÓVIL */}
      <div className="flex shrink-0 items-center justify-between border-b border-borde bg-superficie px-4 py-3 md:hidden">
        <div className="text-lg font-black tracking-tight text-principal">NA<span className="text-marca">VE</span>W</div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
          className="flex h-10 w-10 items-center justify-center rounded-md bg-superficie-muted text-principal transition hover:bg-principal hover:text-inverso"
        >
          {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>

      {/* SIDEBAR */}
      <aside
        className={`fixed md:relative z-50 transition-all duration-300 ease-in-out bg-principal flex flex-col h-full
          ${mobileMenuOpen ? "left-0" : "-left-full"} md:left-0 
          ${isCollapsed ? "w-16 md:w-20" : "w-[102px] md:w-50.5"}`}
      >
        <div className="flex h-full flex-col px-1 py-3 md:px-3 md:py-6">
          <div className={`mb-4 px-1 md:mb-8 md:px-3 ${isCollapsed ? "text-center" : ""}`}>
            <div className="text-[11px] font-black tracking-tight text-inverso md:text-xl">NA<span className="text-enfasis">VE</span>W</div>
            {!isCollapsed && <p className="mt-0.5 text-[5px] font-medium tracking-[0.08em] text-nav-muted md:mt-1 md:text-[9px]">Farbiopharma</p>}
          </div>

          {/* Botón Colapsar (Desktop) */}
          <button
            onClick={toggleSidebar}
            aria-label={isCollapsed ? "Expandir menú" : "Colapsar menú"}
            className={`absolute -right-3 top-6 z-50 h-7 w-7 items-center justify-center rounded-full border border-principal bg-principal text-inverso shadow-sm transition hover:bg-superficie-muted hover:text-principal hover:border-superficie ${
              mobileMenuOpen ? "flex" : "hidden md:flex"
            }`}
          >
            {isCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>

          {/* Perfil Usuario */}
          <div className={`mb-3 flex items-center transition-all ${isCollapsed ? "justify-center" : "px-0.5 md:mb-6 md:px-2"}`}>
            <img
              src={getHDImage(perfilUsuario?.avatarUsuario) || "/usuarioSinfoto.jpg"}
              alt="Avatar"
              className="h-5 w-5 rounded-full border border-borde-acento object-cover shadow-sm md:h-10 md:w-10 md:border-2"
            />
            {!isCollapsed && (
              <div className="ml-1 min-w-0 overflow-hidden md:ml-3">
                <p className="truncate text-[7px] font-bold text-inverso md:text-xs">{nombreUsuario}</p>
                <p className="text-[6px] capitalize text-nav-muted md:text-[10px]">{userRole || "usuario"}</p>
              </div>
            )}
          </div>

          <hr className="mb-3 border-nav-borde md:mb-6" />

          {/* Navegación */}
          <nav className="flex-1 overflow-y-auto">
            <ul className="space-y-0.5 text-[9px] md:space-y-2 md:text-sm">
              
              {/* Menú Usuario Estándar (No Admins) */}
              {!esAdministrador && (
                <>
                  <li>
                    <Link
                      to={ esSupervisor ? "/dashboard/paqueteria" : "/dashboard/transporte"}
                      onClick={handleMenuItemClick}
                      className={navItemClass(urlActual.startsWith("/dashboard/transporte"))}
                    >
                      <ClipboardList size={18} />
                      {!isCollapsed && <span className="ml-0 md:ml-3">Solicitud</span>}
                      {!isCollapsed && <ChevronRight className="ml-auto" size={14} />}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/dashboard/proceso/transporte"
                      onClick={handleMenuItemClick}
                      className={navItemClass(urlActual.startsWith("/dashboard/proceso"))}
                    >
                      <Workflow size={18} />
                      {!isCollapsed && <span className="ml-0 md:ml-3">Proceso</span>}
                      {!isCollapsed && <ChevronRight className="ml-auto" size={14} />}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/dashboard/historico/transporte"
                      onClick={handleMenuItemClick}
                      className={navItemClass(urlActual.startsWith("/dashboard/historico"))}
                    >
                      <History size={18} />
                      {!isCollapsed && <span className="ml-0 md:ml-3">Histórico</span>}
                      {!isCollapsed && <ChevronRight className="ml-auto" size={14} />}
                    </Link>
                  </li>
                </>
              )}

              {esSupervisor && (
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      handleMenuItemClick();
                      setModalLlegadaAbierto(true);
                    }}
                    className={`${navItemClass(false)} w-full text-left`}
                  >
                    <Truck size={18} />

                    {!isCollapsed && (
                      <span className="ml-0 md:ml-3">
                        Avisar llegada
                      </span>
                    )}
                  </button>
                </li>
              )}
              {/* Menú Administrador */}
              {esAdministrador && (
                <>
                  <p className={`mb-2 mt-4 text-[10px] font-bold uppercase text-nav-muted ${isCollapsed ? "text-center" : "px-2"}`}>Admin</p>
                  <li>
                    <Link
                      to="/dashboard/admin/usuarios"
                      onClick={handleMenuItemClick}
                        className={navItemClass(urlActual === "/dashboard/admin/usuarios")}
                    >
                      <Users size={18} />
                      {!isCollapsed && <span className="ml-0 md:ml-3">Usuarios</span>}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/dashboard/admin/organigrama"
                      onClick={handleMenuItemClick}
                      className={navItemClass(urlActual === "/dashboard/admin/organigrama")}
                    >
                      <Workflow size={18} />
                      {!isCollapsed && <span className="ml-0 md:ml-3">Organigrama</span>}
                    </Link>
                  </li>
                </>
              )}

            </ul>
          </nav>

          {/* Logout */}
          <div className="mt-auto pt-3 md:pt-4">
            <button
              onClick={handleLogout}
              className={`flex w-full items-center gap-1 rounded-md px-1 py-2 text-[9px] text-nav-texto transition hover:bg-error-hover hover:text-inverso md:gap-3 md:px-3 md:py-3 md:text-sm [&>svg]:h-3 [&>svg]:w-3 md:[&>svg]:h-[18px] md:[&>svg]:w-[18px] ${isCollapsed ? "justify-center" : ""}`}
            >
              <LogOut size={18} />
              {!isCollapsed && <span className="ml-0 font-medium md:ml-3">Cerrar Sesión</span>}
            </button>
          </div>
        </div>
      </aside>
      
      <ContextSidebar
        role={userRole}
        path={urlActual}
        search={location.search}
        mobileMenuOpen={mobileMenuOpen}
        sidebarCollapsed={isCollapsed}
        onNavigate={handleMenuItemClick}
      />

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={tituloSeccion} userName={nombreUsuario} />
        <main className="min-h-0 flex-1 overflow-y-auto bg-fondo"><Outlet /></main>
      </div>

      {/* Overlay para móvil */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-principal/50 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      {esSupervisor && (
        <AvisarLlegada
          open={modalLlegadaAbierto}
          onClose={() => setModalLlegadaAbierto(false)}
          token={token}
        />
      )}
    </div>
  );
};

export default Dashboard;
