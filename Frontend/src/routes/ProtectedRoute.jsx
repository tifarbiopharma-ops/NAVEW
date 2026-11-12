import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import storeAuth from '../context/storeAuth';
import { esTalentoHumano, isTokenValid } from '../utils/authClaims';
import AccesoTalentoHumano from '../pages/Autenticación/AccesoTalentoHumano';

export default function ProtectedRoute({ children }) {
  const token = storeAuth((state) => state.token);
  const valid = Boolean(token) && isTokenValid(token);

  useEffect(() => {
    if (token && !valid) {
      storeAuth.getState().logout();
    }
  }, [token, valid]);

  if (!valid) {
    return <Navigate to="/login" replace />;
  }

  if (esTalentoHumano(token)) return <AccesoTalentoHumano token={token} />;

  return children;
}

