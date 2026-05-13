import { useState, useEffect, useCallback } from "react";
import { buildPublicApiUrl } from "../lib/api";

export function usePublicApi<T>(
  endpoint: string,
  baseUrl: string,
  publicApiKey: string | null,
  enabled = true
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!publicApiKey || !enabled) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const apiUrl = buildPublicApiUrl(baseUrl);
      const response = await fetch(`${apiUrl}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicApiKey}`,
        },
      });
      if (!response.ok) throw new Error(`Request failed with ${response.status}`);
      const body = await response.json();
      setData(body.data ?? body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [endpoint, baseUrl, publicApiKey, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
