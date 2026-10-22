
import { useCallback } from 'react';
import axios from 'axios';
import storeAuth from '../context/storeAuth';

function useFetch() {
  const fetchDataBackend = useCallback(
    async (
      url,
      data = null,
      method = 'GET',
      token = null,
      showToast = false,
      signal = null
    ) => {
      try {
        const storeToken = storeAuth.getState().token;
        const authToken = token || storeToken;

        const requestHeaders = {
          'Content-Type': 'application/json',
        };

        if (authToken) {
          requestHeaders.Authorization = `Bearer ${authToken}`;
        }

        const options = {
          method,
          url,
          headers: requestHeaders,
          signal,
        };

        if (data && method.toUpperCase() !== 'GET') {
          options.data = data;
        }

        const response = await axios(options);

        return response.data;

      } catch (error) {
        if (
          axios.isCancel(error) ||
          error?.code === 'ERR_CANCELED'
        ) {
          return null;
        }

        const status = error?.response?.status;

        if (status === 401) {
          storeAuth.getState().logout();
          window.location.href = '/login';
        }

        console.error('Error del backend:', {
          status,
          data: error?.response?.data,
        });

        // Conservar el mensaje original del backend
        if (error.response) {
          return {
            ...error.response.data,
            success: false,
            status,
            msg:
              error.response.data?.msg ||
              error.response.data?.message ||
              'Error al procesar la solicitud',
          };
        }

        return {
          success: false,
          msg: 'No se pudo conectar con el servidor',
        };
      }
    },
    []
  );

  return { fetchDataBackend };
}

export default useFetch;

