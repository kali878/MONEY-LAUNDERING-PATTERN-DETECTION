import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "../utils/apiBase";
const API_BASE_URL = API_BASE;

/**
 * A debug version of useFetchData that bypasses authentication
 */
const useDebugFetch = (initialUrl) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [url, setUrl] = useState(initialUrl);

  const fetchData = useCallback(async () => {
    if (!url) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`[DEBUG FETCH] Calling: ${API_BASE_URL}${url}`);

      const response = await fetch(`${API_BASE_URL}${url}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`[DEBUG FETCH] Success:`, result);
      setData(result);
    } catch (err) {
      console.error("[DEBUG FETCH] Error:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = () => {
    fetchData();
  };

  return { data, loading, error, refetch, setUrl };
};

export default useDebugFetch;
