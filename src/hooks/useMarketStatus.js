import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config/api";

/**
 * Custom hook to check US market status
 * Uses Polygon API with fallback to JavaScript time calculation
 * @returns {Object} Market status object with isOpen, reason, status, loading, and error
 */
export function useMarketStatus() {
  const [status, setStatus] = useState({
    isOpen: false,
    reason: 'outside_hours',
    message: 'Market Closed',
    currentTime: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const source = new EventSource(`${API_BASE_URL}/api/stream`);

    source.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed?.marketStatus) {
          setStatus(parsed.marketStatus);
          setError(null);
        }
      } catch (eventError) {
        setError(eventError.message || "Invalid stream payload");
      } finally {
        setLoading(false);
      }
    };

    source.onerror = () => {
      setError("Live market stream disconnected");
      setLoading(false);
    };

    return () => {
      source.close();
    };
  }, []);

  return {
    isOpen: status.isOpen,
    reason: status.reason,
    status: status.message,
    currentTime: status.currentTime ? new Date(status.currentTime) : null,
    loading,
    error,
  };
}
