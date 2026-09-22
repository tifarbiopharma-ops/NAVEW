import { useEffect } from 'react';
import storeAuth from '../context/storeAuth';
import Forbidden from '../pages/Forbidden';
import { Navigate } from 'react-router-dom';
import { getAuthClaims, isTokenValid } from '../utils/authClaims';

export default function PrivateRouteWithRole({ children, allowedRoles = [] }) {
    const token = storeAuth((state) => state.token);
    const claims = getAuthClaims(token);
    const role = (claims?.rol || '').toLowerCase();
    const valid = isTokenValid(token);

    useEffect(() => {
        if (!token || !valid) {
            storeAuth.getState().logout();
        }
    }, [token, valid]);

    if (!token || !valid) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.map((item) => item.toLowerCase()).includes(role)) {
        return <Forbidden />;
    }

    return children;
}