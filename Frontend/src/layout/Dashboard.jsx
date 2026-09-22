import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import storeAuth from "../context/storeAuth";
import useFetch from "../hooks/useFetch";
import { getAuthClaims } from "../utils/authClaims";

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

  const esAdministrador = userRole === "administrador";
  const esSolicitante = userRole.includes("solicitante");
  const esJefe = userRole.includes("jefe");
  const esSupervisor = userRole.includes("supervisor");

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

  const bgColorsByRole = {
    solicitante: "from-white via-white to-white",
    jefe: "from-white via-white to-white",
    supervisor: "from-white via-white to-white",
    administrador: "from-slate-50 via-slate-50 to-slate-50",
  };

  const menuClassesByRole = {
    solicitante: {
      active: "bg-gradient-to-r from-[#274C77] via-[#3b5f85] to-[#1F3F5B] text-white",
      inactive: "text-slate-800 hover:bg-gradient-to-r hover:from-[#274C77] hover:via-[#3b5f85] hover:to-[#1F3F5B] hover:text-white"
    },
    jefe: {
      active: "bg-gradient-to-r from-[#274C77] via-[#3b5f85] to-[#1F3F5B] text-white",
      inactive: "text-slate-800 hover:bg-gradient-to-r hover:from-[#274C77] hover:via-[#3b5f85] hover:to-[#1F3F5B] hover:text-white"
    },
    supervisor: {
      active: "bg-gradient-to-r from-[#274C77] via-[#3b5f85] to-[#1F3F5B] text-white",
      inactive: "text-slate-800 hover:bg-gradient-to-r hover:from-[#274C77] hover:via-[#3b5f85] hover:to-[#1F3F5B] hover:text-white"
    },
    administrador: {
      active: "bg-zinc-200 text-zinc-800",
      inactive: "text-slate-800 hover:bg-zinc-200"
    }
  };

  const currentBg = bgColorsByRole[userRole] || bgColorsByRole.solicitante;

  return (
    <div className="flex h-screen font-sans flex-col md:flex-row bg-gray-50" style={{ fontFamily: "Gowun Batang, serif" }}>
      
      {/* HEADER MÓVIL */}
      <div className="md:hidden flex items-center justify-between bg-gray-100 border-b border-gray-300 px-4 py-2 shrink-0">
        <img 
          src="/logo.png" 
          alt="Farbiopharma" 
          className="h-8 w-auto object-contain" 
        />
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center hover:bg-[#17243D] hover:text-white transition duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* SIDEBAR */}
      <aside
        className={`fixed md:relative z-40 transition-all duration-300 ease-in-out bg-white border-r border-slate-200 flex flex-col h-full
          ${mobileMenuOpen ? "left-0" : "-left-full"} md:left-0 
          ${isCollapsed ? "md:w-20" : "md:w-64"} w-64`}
      >
        <div className="p-4 flex flex-col h-full">
          {/* Botón Colapsar (Desktop) */}
          <button
            onClick={toggleSidebar}
            className="hidden md:flex h-10 w-10 bg-gray-200 rounded-full items-center justify-center hover:bg-gray-300 transition mb-4 self-end"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className={`w-5 h-5 transform transition ${isCollapsed ? "rotate-180" : ""}`}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>

          {/* Perfil Usuario */}
          <div className={`flex items-center mb-6 transition-all ${isCollapsed ? "justify-center" : "px-2"}`}>
            <img
              src={getHDImage(perfilUsuario?.avatarUsuario) || "/usuarioSinfoto.jpg"}
              alt="Avatar"
              className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-sm"
            />
            {!isCollapsed && (
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-bold text-gray-800 truncate">{perfilUsuario?.nombre || "Usuario"}</p>
                <p className="text-xs text-gray-500 capitalize">{userRole || "usuario"}</p>
              </div>
            )}
          </div>

          <hr className="border-slate-200 mb-6" />

          {/* Navegación */}
          <nav className="flex-1 overflow-y-auto">
            <ul className="space-y-2 text-sm">
              
              {/* Menú Usuario Estándar (No Admins) */}
              {!esAdministrador && (
                <>
                  {(esSolicitante || esJefe) && (
                    <>
                      <li>
                        <Link
                          to="/dashboard/salidas"
                          onClick={handleMenuItemClick}
                          className={`flex items-center p-2 rounded-lg transition ${
                              urlActual === "/dashboard/salidas" && !location.search.includes("view=aprobadas")
                                ? `${menuClassesByRole[userRole]?.active || 'bg-[#B2EBF2] text-black'} font-bold`
                                : `${menuClassesByRole[userRole]?.inactive || 'text-black hover:bg-[#B2EBF2]'}`
                            } ${isCollapsed ? "justify-center" : ""}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`w-6 h-6 transition-opacity ${urlActual === "/dashboard/salidas" && !location.search.includes("view=aprobadas") ? "opacity-100" : "opacity-70"}`}>
                            <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z" />
                            <path d="M7 9h10" />
                            <path d="M7 13h7" />
                          </svg>
                          {!isCollapsed && <span className="ml-3">Salidas</span>}
                        </Link>
                      </li>

                      {esSolicitante && (
                        <li>
                          <Link
                            to="/dashboard/salidas?view=aprobadas"
                            onClick={handleMenuItemClick}
                            className={`flex items-center p-2 rounded-lg transition ${
                                urlActual.includes("/dashboard/salidas") && location.search.includes("view=aprobadas")
                                  ? `${menuClassesByRole[userRole]?.active || 'bg-[#B2EBF2] text-black'} font-bold`
                                  : `${menuClassesByRole[userRole]?.inactive || 'text-black hover:bg-[#B2EBF2]'}`
                              } ${isCollapsed ? "justify-center" : ""}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`w-6 h-6 transition-opacity ${urlActual.includes("/dashboard/salidas") && location.search.includes("view=aprobadas") ? "opacity-100" : "opacity-70"}`}>
                              <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" />
                              <path d="M8 9h8M8 13h8" />
                              <path d="M9 17l2 2 4-5" />
                            </svg>
                            {!isCollapsed && <span className="ml-3">Aprobadas</span>}
                          </Link>
                        </li>
                      )}
                    </>
                  )}

                  {esSupervisor && (
                    <li>
                      <Link
                        to="/dashboard/salidas/validar"
                        onClick={handleMenuItemClick}
                        className={`flex items-center p-2 rounded-lg transition ${
                        urlActual === "/dashboard/salidas/validar"
                          ? `${menuClassesByRole[userRole]?.active || 'bg-[#B2EBF2] text-black'} font-bold`
                          : `${menuClassesByRole[userRole]?.inactive || 'text-black hover:bg-[#B2EBF2]'}`
                      } ${isCollapsed ? "justify-center" : ""}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`w-6 h-6 transition-opacity ${urlActual === "/dashboard/salidas/validar" ? "opacity-100" : "opacity-70"}`}>
                          <path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
                          <path d="M8 8h8" />
                          <path d="M9 12h6" />
                          <path d="M10 16h4" />
                        </svg>
                        {!isCollapsed && <span className="ml-3">Validar QR</span>}
                      </Link>
                    </li>
                  )}
                </>
              )}

              {/* Menú Administrador */}
              {esAdministrador && (
                <>
                  <p className={`text-[10px] font-bold text-gray-400 uppercase mb-2 mt-4 ${isCollapsed ? "text-center" : "px-2"}`}>Admin</p>
                  <li>
                    <Link
                      to="/dashboard/admin/usuarios"
                      onClick={handleMenuItemClick}
                      className={`flex items-center p-2 rounded-lg transition ${
                        urlActual === "/dashboard/admin/usuarios"
                          ? "bg-sky-100 text-sky-700 font-bold"
                          : "text-slate-600 hover:bg-slate-100"
                      } ${isCollapsed ? "justify-center" : ""}`}
                    >
                      <div className="w-5 h-5 flex items-center justify-center">
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      </div>
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
              className={`w-full flex items-center p-2 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition ${isCollapsed ? "justify-center" : ""}`}
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
              </svg>
              {!isCollapsed && <span className="ml-3 font-medium">Cerrar Sesión</span>}
            </button>
          </div>
        </div>
      </aside>
      
      {/* CONTENIDO PRINCIPAL */}
      <main className={`flex-1 min-h-screen overflow-y-auto bg-linear-to-br ${currentBg}`}>
        <Outlet />
      </main>

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