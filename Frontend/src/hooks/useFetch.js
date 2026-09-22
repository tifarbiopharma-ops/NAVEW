import { useCallback } from "react";
import axios from "axios";
import storeAuth from "../context/storeAuth";

function useFetch() {
  const fetchDataBackend = useCallback(async (url, data = null, method = "GET", token = null, showToast = false, signal = null) => {
    try {
      const storeToken = storeAuth.getState().token;
      const authToken = token || storeToken;
      const requestHeaders = {
        "Content-Type": "application/json",
      };

      if (authToken) {
        requestHeaders["Authorization"] = `Bearer ${authToken}`;
      }

      const options = {
        method,
        url,
        headers: requestHeaders,
        signal,
      };

      if (data && method !== "GET") {
        options.data = data;
      }

      const response = await axios(options);
      return response?.data;
    } catch (error) {
      if (axios.isCancel?.(error) || error?.code === 'ERR_CANCELED') {
        return null;
      }
      const status = error?.response?.status;
      if (status === 401) {
        storeAuth.getState().logout();
        window.location.href = '/login';
      }
      console.error(error);
      return null;
    }
  }, []);

  return { fetchDataBackend };
}

export default useFetch;
