import { useLayoutEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import PublicRoute from "./routes/PublicRoute";
import ProtectedRoute from "./routes/ProtectedRoute";
import PrivateRouteWithRole from "./routes/PrivateRouteWithRole";
import storeAuth from "./context/storeAuth";
import { getAuthClaims } from "./utils/authClaims";
import { cerrarSesionNavew } from "./utils/cerrarSesionNavew";

// Layouts
import Dashboard from "./layout/Dashboard";

// Pages
import Login from "./pages/Autenticación/Login";
import SsoRRHH from "./pages/Autenticación/SsoRRHH";
import AdminUsuarios from "./pages/Administrador/Users/AdminUsuarios";
import CrearUsuarioPage from "./pages/Administrador/Users/CrearUsuarioPage";
import EditarUsuario from "./pages/Administrador/Users/EditarUsuario";
import TransporteDashboard from "./pages/Transporte/SolicitudTraslados";
import SolicitudTraslados from "./pages/Transporte/SolicitudTraslados";
import SolicitudPaqueteria from "./pages/Paqueteria/SolicitudPaqueteria";
import ProcesoSolicitudes from "./pages/Proceso/ProcesoSolicitudes";
import HistoricoSolicitudes from "./pages/Historico/HistoricoSolicitudes";
import SolicitudExterno from "./pages/Externo/SolicitudExterno";
import NotFound from "./pages/NotFound";
import Organigrama from "./pages/Administrador/Organigrama/Organigrama";

// 🔹 Componente para manejar el Home inteligente del Dashboard
const DashboardHomeRedirect = () => {
  const token = storeAuth((state) => state.token);
  const claims = getAuthClaims(token);
  const userRole = String(claims?.rol ?? '').trim().toLowerCase();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (userRole === 'administrador') {
    return <Navigate to="/dashboard/admin/usuarios" replace />;
  }

  if (userRole === 'supervisor') {
    return <Navigate to="/dashboard/paqueteria" replace />;
  }

  const rolesTransporte = [
    'solicitante',
    'jefe',
    'subgerente',
    'gerente',
    'subgerentegeneral',
    'gerentegeneral',
    'presidente'
  ];

  if (rolesTransporte.includes(userRole)) {
    return <Navigate to="/dashboard/transporte" replace />;
  }

  return (
    <div role="alert" className="p-6 text-error">
      No se pudo identificar un rol autorizado para tu usuario.
    </div>
  );
};

const CerrarSesionNavew = () => {
  useLayoutEffect(() => { cerrarSesionNavew(); }, []);
  return null;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 🔹 Redirigir raíz a login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/logout" element={<CerrarSesionNavew />} />
        <Route path="/sso/rrhh" element={<SsoRRHH />} />
        <Route
          path="/organigrama/rrhh"
          element={
            <PrivateRouteWithRole allowedRoles={["talento humano"]}>
              <main className="min-h-screen w-full bg-superficie p-2 sm:p-4">
                <Organigrama />
              </main>
            </PrivateRouteWithRole>
          }
        />

        {/* 🔹 Rutas públicas */}
        <Route element={<PublicRoute />}>
          <Route path="login" element={<Login />} />
        </Route>

        {/* 🔹 Rutas protegidas (Dashboard Layout) */}
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        >
          {/* 🔹 Redirección inteligente cuando entren directo a /dashboard */}
          <Route index element={<DashboardHomeRedirect />} />

          <Route
            path="transporte"
            element={
              <PrivateRouteWithRole allowedRoles={["solicitante", "jefe", "subgerente", "gerente", "subgerentegeneral", "gerentegeneral", "presidente", "administrador"]}>
                <TransporteDashboard />
              </PrivateRouteWithRole>
            }
          />
          <Route
            path="transporte/validar"
            element={
              <PrivateRouteWithRole allowedRoles={["supervisor", "administrador"]}>
                <SolicitudTraslados />
              </PrivateRouteWithRole>
            }
          />
          <Route
            path="paqueteria"
            element={
              <PrivateRouteWithRole allowedRoles={["solicitante", "jefe", "subgerente", "gerente", "subgerentegeneral", "gerentegeneral", "presidente", "administrador", "supervisor"]}>
                <SolicitudPaqueteria />
              </PrivateRouteWithRole>
            }
          />
          <Route
            path="externo"
            element={
              <PrivateRouteWithRole allowedRoles={["solicitante", "jefe", "subgerente", "gerente", "subgerentegeneral", "gerentegeneral", "presidente", "administrador"]}>
                <SolicitudExterno />
              </PrivateRouteWithRole>
            }
          />
          <Route
            path="proceso/:modulo"
            element={
              <PrivateRouteWithRole allowedRoles={["solicitante", "jefe", "subgerente", "gerente", "subgerentegeneral", "gerentegeneral", "presidente", "supervisor", "administrador"]}>
                <ProcesoSolicitudes />
              </PrivateRouteWithRole>
            }
          />
          <Route
            path="historico/:modulo"
            element={
              <PrivateRouteWithRole allowedRoles={["solicitante", "jefe", "subgerente", "gerente", "subgerentegeneral", "gerentegeneral", "presidente", "supervisor", "administrador"]}>
                <HistoricoSolicitudes />
              </PrivateRouteWithRole>
            }
          />

          {/* 🔹 Rutas para Administrador */}
          <Route
            path="admin/usuarios"
            element={<PrivateRouteWithRole allowedRoles={["administrador"]}><AdminUsuarios /></PrivateRouteWithRole>}
          />
          <Route
            path="admin/usuarios/nuevo"
            element={<PrivateRouteWithRole allowedRoles={["administrador"]}><CrearUsuarioPage /></PrivateRouteWithRole>}
          />
          <Route
            path="admin/usuarios/editar/:id"
            element={<PrivateRouteWithRole allowedRoles={["administrador"]}><EditarUsuario /></PrivateRouteWithRole>}
          />
          {/* Organigrama completo dentro del Dashboard solo para administradores */}
          <Route
            path="admin/organigrama"
            element={
              <PrivateRouteWithRole allowedRoles={["administrador"]}>
                <div className="h-full w-full">
                  <Organigrama />
                </div>
              </PrivateRouteWithRole>
            }
          />
        </Route>

        

        {/* 🔹 Manejo de 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
