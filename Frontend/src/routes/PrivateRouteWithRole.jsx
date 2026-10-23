import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import storeAuth from '../context/storeAuth';
import Forbidden from '../pages/Forbidden';
import { getAuthClaims, isTokenValid } from '../utils/authClaims';

export default function PrivateRouteWithRole({
  children,
  allowedRoles = []
}) {
  const token = storeAuth((state) => state.token);
  const valid = Boolean(token) && isTokenValid(token);

  const claims = valid ? getAuthClaims(token) : null;
  const role = String(claims?.rol ?? '').trim().toLowerCase();

  useEffect(() => {
    if (token && !valid) {
      storeAuth.getState().logout();
    }
  }, [token, valid]);

  if (!valid) {
    return <Navigate to="/login" replace />;
  }

  const hasPermission =
    allowedRoles.length === 0 ||
    allowedRoles.some(
      (item) => String(item).trim().toLowerCase() === role
    );

  if (!hasPermission) {
    return <Forbidden />;
  }

  return children;
}