import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import storeAuth from '../context/storeAuth';
import { esTalentoHumano, isTokenValid } from '../utils/authClaims';
import AccesoTalentoHumano from '../pages/Autenticación/AccesoTalentoHumano';

export default function PublicRoute() {
  const token = storeAuth((state) => state.token);
  const valid = Boolean(token) && isTokenValid(token);

  useEffect(() => {
    if (token && !valid) {
      storeAuth.getState().logout();
    }
  }, [token, valid]);

  if (valid) {
    if (esTalentoHumano(token)) return <AccesoTalentoHumano token={token} />;
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
