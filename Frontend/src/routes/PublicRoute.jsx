import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import storeAuth from '../context/storeAuth';
import { isTokenValid } from '../utils/authClaims';

export default function PublicRoute() {
  const token = storeAuth((state) => state.token);
  const valid = Boolean(token) && isTokenValid(token);

  useEffect(() => {
    if (token && !valid) {
      storeAuth.getState().logout();
    }
  }, [token, valid]);

  if (valid) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}