import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import PublicRoute from "./routes/PublicRoute";
import ProtectedRoute from "./routes/ProtectedRoute";
import PrivateRouteWithRole from "./routes/PrivateRouteWithRole";
import storeAuth from "./context/storeAuth";
import { getAuthClaims } from "./utils/authClaims";

// Layouts
import Dashboard from "./layout/Dashboard";

// Pages
import Login from "./pages/Autenticación/Login";
import AdminUsuarios from "./pages/Administrador/AdminUsuarios";
import CrearUsuarioPage from "./pages/Administrador/CrearUsuarioPage";
import EditarUsuario from "./pages/Administrador/EditarUsuario";
import TransporteDashboard from "./pages/Transporte/SolicitudTraslados";
import SolicitudTraslados from "./pages/Transporte/SolicitudTraslados";
import SolicitudPaqueteria from "./pages/Paqueteria/SolicitudPaqueteria";
import ProcesoSolicitudes from "./pages/Proceso/ProcesoSolicitudes";
import HistoricoSolicitudes from "./pages/Historico/HistoricoSolicitudes";
import SolicitudExterno from "./pages/Externo/SolicitudExterno";
import NotFound from "./pages/NotFound";

// 🔹 Componente para manejar el Home inteligente del Dashboard
const DashboardHomeRedirect = () => {
  const token = storeAuth(state => state.token);
  const claims = getAuthClaims(token);
  const userRole = claims?.rol?.toLowerCase() || '';

  if (userRole.includes('administrador')) {
    return <Navigate to="admin/usuarios" replace />;
  }

  if (userRole.includes('supervisor')) {
    return <Navigate to="paqueteria" replace />;
  }

  if (userRole.includes('jefe') || userRole.includes('solicitante')) {
    return <Navigate to="transporte" replace />;
  }

  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 🔹 Redirigir raíz a login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

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
              <PrivateRouteWithRole allowedRoles={["solicitante", "jefe", "administrador"]}>
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
              <PrivateRouteWithRole allowedRoles={["solicitante", "jefe", "administrador", "supervisor"]}>
                <SolicitudPaqueteria />
              </PrivateRouteWithRole>
            }
          />
          <Route
            path="externo"
            element={
              <PrivateRouteWithRole allowedRoles={["solicitante", "jefe", "administrador"]}>
                <SolicitudExterno />
              </PrivateRouteWithRole>
            }
          />
          <Route
            path="proceso/:modulo"
            element={
              <PrivateRouteWithRole allowedRoles={["solicitante", "jefe", "supervisor", "administrador"]}>
                <ProcesoSolicitudes />
              </PrivateRouteWithRole>
            }
          />
          <Route
            path="historico/:modulo"
            element={
              <PrivateRouteWithRole allowedRoles={["solicitante", "jefe", "supervisor", "administrador"]}>
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
        </Route>

        {/* 🔹 Manejo de 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;