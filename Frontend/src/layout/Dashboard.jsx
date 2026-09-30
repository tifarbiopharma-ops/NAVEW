import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import storeAuth from "../context/storeAuth";
import useFetch from "../hooks/useFetch";
import { getAuthClaims } from "../utils/authClaims";
import { ChevronRight, ClipboardList, History, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Users, Workflow, X } from "lucide-react";
import ContextSidebar from "./ContextSidebar";
import TopBar from "./TopBar";

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const urlActual = location.pathname;
  const { logout, token } = storeAuth();
  const { fetchDataBackend } = useFetch();

  const [perfilUsuario, setPerfilUsuario] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Extracción segura de roles
  const claims = token ? getAuthClaims(token) : null;
  const userRole = claims?.rol?.toLowerCase() || "";
  const nombreUsuario = perfilUsuario?.nombre || claims?.nombre || "Usuario";

  const esAdministrador = userRole === "administrador";
  const esSupervisor = userRole === "supervisor";

  const tituloSeccion = urlActual.startsWith("/dashboard/admin")
    ? "Administración"
    : urlActual.startsWith("/dashboard/proceso")
      ? "Proceso"
    : urlActual.startsWith("/dashboard/historico")
      ? "Histórico"
    : urlActual.startsWith("/dashboard/transporte")
      ? "Transporte"
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

  const navItemClass = (active) => `group flex items-center gap-3 rounded-md px-3 py-3 text-sm transition ${
    active ? "bg-[#285789] font-bold text-white" : "text-[#aab8cf] hover:bg-[#1d3558] hover:text-white"
  } ${isCollapsed ? "justify-center" : ""}`;

  return (
    <div className="flex h-screen flex-col bg-[#f4f7fa] font-sans text-[#17243d] md:flex-row">
      
      {/* HEADER MÓVIL */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <div className="text-lg font-black tracking-tight text-[#17243d]">NA<span className="text-[#3970a8]">WE</span>W</div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
          className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-[#17243d] transition hover:bg-[#17243d] hover:text-white"
        >
          {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>

      {/* SIDEBAR */}
      <aside
        className={`fixed md:relative z-40 transition-all duration-300 ease-in-out bg-[#142744] flex flex-col h-full
          ${mobileMenuOpen ? "left-0" : "-left-full"} md:left-0 
          ${isCollapsed ? "md:w-20" : "md:w-50.5"} w-64`}
      >
        <div className="flex h-full flex-col px-3 py-6">
          <div className={`mb-8 px-3 ${isCollapsed ? "text-center" : ""}`}>
            <div className="text-xl font-black tracking-tight text-white">NA<span className="text-[#77a8d2]">WE</span>W</div>
            {!isCollapsed && <p className="mt-1 text-[9px] font-medium tracking-[0.08em] text-[#9aacbf]">Farbiopharma</p>}
          </div>

          {/* Botón Colapsar (Desktop) */}
          <button
            onClick={toggleSidebar}
            aria-label={isCollapsed ? "Expandir menú" : "Colapsar menú"}
            className="absolute -right-3 top-6 hidden h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-[#17243d] shadow-sm transition hover:bg-slate-100 md:flex"
          >
            {isCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>

          {/* Perfil Usuario */}
          <div className={`mb-6 flex items-center transition-all ${isCollapsed ? "justify-center" : "px-2"}`}>
            <img
              src={getHDImage(perfilUsuario?.avatarUsuario) || "/usuarioSinfoto.jpg"}
              alt="Avatar"
              className="h-10 w-10 rounded-full border-2 border-[#dce9f7] object-cover shadow-sm"
            />
            {!isCollapsed && (
              <div className="ml-3 overflow-hidden">
                <p className="truncate text-xs font-bold text-white">{nombreUsuario}</p>
                <p className="text-[10px] capitalize text-[#91a4bd]">{userRole || "usuario"}</p>
              </div>
            )}
          </div>

          <hr className="mb-6 border-[#2b4162]" />

          {/* Navegación */}
          <nav className="flex-1 overflow-y-auto">
            <ul className="space-y-2 text-sm">
              
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
                      {!isCollapsed && <span className="ml-3">Solicitud</span>}
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
                      {!isCollapsed && <span className="ml-3">Proceso</span>}
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
                      {!isCollapsed && <span className="ml-3">Histórico</span>}
                      {!isCollapsed && <ChevronRight className="ml-auto" size={14} />}
                    </Link>
                  </li>
                </>
              )}

              {/* Menú Administrador */}
              {esAdministrador && (
                <>
                  <p className={`mb-2 mt-4 text-[10px] font-bold uppercase text-[#7186a1] ${isCollapsed ? "text-center" : "px-2"}`}>Admin</p>
                  <li>
                    <Link
                      to="/dashboard/admin/usuarios"
                      onClick={handleMenuItemClick}
                        className={navItemClass(urlActual === "/dashboard/admin/usuarios")}
                    >
                      <Users size={18} />
                      {!isCollapsed && <span className="ml-3">Usuarios</span>}
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </nav>

          {/* Logout */}
          <div className="mt-auto pt-4">
            <button
              onClick={handleLogout}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm text-[#aab8cf] transition hover:bg-[#6d2932] hover:text-white ${isCollapsed ? "justify-center" : ""}`}
            >
              <LogOut size={18} />
              {!isCollapsed && <span className="ml-3 font-medium">Cerrar Sesión</span>}
            </button>
          </div>
        </div>
      </aside>
      
      <ContextSidebar role={userRole} path={urlActual} search={location.search} />

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={tituloSeccion} userName={nombreUsuario} />
        <main className="min-h-0 flex-1 overflow-y-auto bg-[#f4f7fa]"><Outlet /></main>
      </div>

      {/* Overlay para móvil */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;