import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import storeAuth from '../context/storeAuth';
import { isTokenValid } from '../utils/authClaims';

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

  return children;
}

