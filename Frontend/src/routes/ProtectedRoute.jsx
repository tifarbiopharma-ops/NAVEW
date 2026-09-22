import { useEffect } from "react";
import { Navigate } from "react-router-dom"
import storeAuth from "../context/storeAuth"
import { isTokenValid } from '../utils/authClaims';

const ProtectedRoute = ({ children }) => {
    const token = storeAuth(state => state.token)
    const valid = isTokenValid(token);

    useEffect(() => {
        if (!token || !valid) {
            storeAuth.getState().logout();
        }
    }, [token, valid]);

    if (!token || !valid) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

export default ProtectedRoute

