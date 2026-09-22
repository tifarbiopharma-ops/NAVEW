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
import SalidasDashboard from "./pages/Salidas/SalidasDashboard";
import ValidarSalidaQR from "./pages/Salidas/ValidarSalidaQR";
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
    return <Navigate to="salidas/validar" replace />;
  }

  if (userRole.includes('jefe') || userRole.includes('solicitante')) {
    return <Navigate to="salidas" replace />;
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
            path="salidas"
            element={
              <PrivateRouteWithRole allowedRoles={["solicitante", "jefe", "administrador"]}>
                <SalidasDashboard />
              </PrivateRouteWithRole>
            }
          />
          <Route
            path="salidas/validar"
            element={
              <PrivateRouteWithRole allowedRoles={["supervisor", "administrador"]}>
                <ValidarSalidaQR />
              </PrivateRouteWithRole>
            }
          />

          {/* 🔹 Rutas para Administrador */}
          <Route path="admin/usuarios" element={<AdminUsuarios />} />
          <Route path="admin/usuarios/nuevo" element={<CrearUsuarioPage />} />
          <Route path="admin/usuarios/editar/:id" element={<EditarUsuario />} />
        </Route>

        {/* 🔹 Manejo de 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;