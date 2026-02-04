import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth.jsx";
import { apiRequest } from "../services/api.js";

/**
 * A custom React hook for fetching data from the backend API.
 * It now handles authentication automatically and waits for the user to be authenticated.
 * @param {string} initialUrl - The initial API endpoint to fetch data from.
 * @returns {{data: any, loading: boolean, error: Error|null, refetch: function, setUrl: function}}
 */
const useFetchData = (initialUrl) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [url, setUrl] = useState(initialUrl);

  // Get authentication state from our dedicated auth hook
  const { user, loading: authLoading } = useAuth();

  const fetchData = useCallback(async () => {
    // Don't fetch if the URL is null or empty
    if (!url) {
      setData(null);
      setLoading(false);
      return;
    }

    // Wait until Firebase has confirmed if a user is logged in or not
    if (authLoading) {
      return;
    }

    // If authentication is confirmed and there is no user, set an error
    if (!user) {
      setError(new Error("Authentication required. Please sign in."));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await apiRequest(url);
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [url, user, authLoading]); // Dependencies now include user and auth state

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Function to allow components to manually trigger a refetch
  const refetch = () => {
    fetchData();
  };

  // We return 'setUrl' so components can dynamically change the fetch URL
  return { data, loading, error, refetch, setUrl };
};

export default useFetchData;
