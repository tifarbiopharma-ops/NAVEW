import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom"
import storeAuth from "../context/storeAuth"
import { isTokenValid } from '../utils/authClaims';

const PublicRoute  = () => {
    const token = storeAuth((state) => state.token)
    const valid = isTokenValid(token);

    useEffect(() => {
        if (token && !valid) {
            storeAuth.getState().logout();
        }
    }, [token, valid]);

    if (token && valid) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />
}

export default PublicRoute