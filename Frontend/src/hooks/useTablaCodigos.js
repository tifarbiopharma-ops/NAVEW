import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useFetch from './useFetch';
import storeAuth from '../context/storeAuth';
import { getAuthClaims } from '../utils/authClaims';

/**
 * Hook personalizado para gestionar la lógica de tablas de códigos por rol
 * @param {string} userRole - El rol del usuario (solicitante, compras, contabilidad, maestrodedatos)
 * @param {string} status - El status que se debe buscar
 * @param {string} editRoute - La ruta base para editar (ej: '/dashboard/insumos/editar')
 * @param {object} colorConfig - Configuración de colores del rol
 * @returns {object} Lógica completa de la tabla
 */
export const useTablaCodigos = (userRole, status, editRoute, colorConfig, options = {}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const { fetchDataBackend } = useFetch();
  const navigate = useNavigate();
  const { token } = storeAuth();
  const currentUserId = getAuthClaims(token)?.id;

  // Calcular items por página dinámicamente basado en altura de pantalla
  useEffect(() => {
    const calculateItems = () => {
      const vh = window.innerHeight;
      const isMobile = window.innerWidth < 768;

      if (isMobile) {
        const dynamicCards = Math.floor((vh - 260) / 75);
        setItemsPerPage(Math.max(3, dynamicCards));
      } else {
        const dynamicRows = Math.floor((vh - 340) / 85);
        setItemsPerPage(Math.max(4, dynamicRows));
      }
    };

    calculateItems();
    window.addEventListener('resize', calculateItems);
    return () => window.removeEventListener('resize', calculateItems);
  }, []);

  const loadData = useCallback(async () => {
    if (!status && !options.endpoint) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const sanitizedStatus = encodeURIComponent((status || '').trim());
      let url = options.endpoint;

      if (!url && userRole === 'solicitante' && currentUserId) {
        url = `${import.meta.env.VITE_BACKEND_URL}/api/codigos/search?status=${sanitizedStatus}&created_by=${encodeURIComponent(currentUserId)}`;
      }

      if (!url) {
        url = `${import.meta.env.VITE_BACKEND_URL}/api/codigos/search?status=${sanitizedStatus}`;
      }

      // Crear AbortController y watchdog para evitar que una petición colgada deje `loading` en true
      const controller = new AbortController();
      const abortSignal = controller.signal;
      const abortTimer = setTimeout(() => {
        try {
          controller.abort();
        } catch (e) {
          // ignore
        }
      }, 10000); // 10s

      const response = await fetchDataBackend(url, null, 'GET', null, false, abortSignal);

      // Asegurarnos de limpiar items cuando la respuesta no trae códigos
      setItems(response?.codigos || []);
      clearTimeout(abortTimer);
    } catch (err) {
      console.error('Error cargando códigos:', err);
      // En caso de error, limpiamos items para evitar estado stale
      setItems([]);
    } finally {
      setLoading(false);
      setCurrentPage(1);
    }
  }, [fetchDataBackend, options.endpoint, status, userRole, currentUserId]);

  // Cargar datos del backend
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calcular paginación
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(items.length / itemsPerPage)),
    [items.length, itemsPerPage]
  );

  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  }, [items, currentPage, itemsPerPage]);

  // Navegar a editar
  const handleEdit = (id) => {
    navigate(`${editRoute}/${id}`);
  };

  return {
    items,
    loading,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    totalPages,
    currentItems,
    handleEdit,
    refreshItems: loadData,
    clasesColor: colorConfig
  };
};
