// src/hooks/useOrganigrama.js
import { useState, useEffect, useCallback, useRef } from "react";
import useFetch from "./useFetch";
import storeAuth from "../context/storeAuth";

export function useOrganigrama() {
  const token = storeAuth((state) => state.token);
  const { fetchDataBackend } = useFetch();

  const [data, setData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const yaCargo = useRef(false);

  const cargar = useCallback(async () => {
    if (!token) return;                  // 🔒 sin token, no dispara

    try {
      setLoading(true);
      setError(null);

      const url = `${import.meta.env.VITE_BACKEND_URL}/api/jerarquia/organigrama`;
      const json = await fetchDataBackend(url, null, "GET", token, false);

      if (json?.success === false || Number(json?.status) >= 400) {
        throw new Error(json.msg || "Error cargando el organigrama");
      }

      setData(json || { nodes: [], edges: [] });
    } catch (e) {
      console.error(e);
      setError(e.message || "Error cargando el organigrama");
    } finally {
      setLoading(false);
    }
  }, [token, fetchDataBackend]);

  useEffect(() => {
    if (!token) return;
    if (yaCargo.current) return;

    yaCargo.current = true;
    cargar();
  }, [token, cargar]);

  return { data, loading, error, recargar: cargar };
}
