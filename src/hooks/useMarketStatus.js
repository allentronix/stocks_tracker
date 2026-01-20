import { useState, useEffect, useRef, useCallback } from 'react';

const POLL_INTERVAL_MS = 60000; // 60 seconds
const CACHE_KEY = 'marketStatus_cache';
const CACHE_TIMESTAMP_KEY = 'marketStatus_cache_timestamp';
const CACHE_TTL_MS = 300000; // 5 minutes cache for API responses

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

  const pollingIntervalRef = useRef(null);
  const isCheckingRef = useRef(false);

  /**
   * Get current time in ET timezone and check if market is open
   * This is the fallback calculation if API is unavailable
   */
  const checkMarketStatusFallback = useCallback(() => {
    try {
      // Get current time in ET timezone
      const now = new Date();
      const etTimeString = now.toLocaleString('en-US', {
        timeZone: 'America/New_York',
        hour12: false
      });
      const etTime = new Date(etTimeString);

      const day = etTime.getDay(); // 0 = Sunday, 6 = Saturday
      const hours = etTime.getHours();
      const minutes = etTime.getMinutes();
      const timeInHours = hours + minutes / 60;

      // Check conditions
      const isWeekend = day === 0 || day === 6;
      const isWithinMarketHours = timeInHours >= 9.5 && timeInHours < 16; // 9:30 AM to 4:00 PM

      let reason = 'outside_hours';
      let message = 'Market Closed';
      let isOpen = false;

      if (isWeekend) {
        reason = 'weekend';
        message = 'Market Closed (Weekend)';
      } else if (isWithinMarketHours) {
        reason = 'open';
        message = 'Market Open';
        isOpen = true;
      } else {
        reason = 'outside_hours';
        message = 'Market Closed (Outside Hours)';
      }

      // Debug logging
      console.log('[Market Status - Fallback]', {
        currentTimeET: etTime.toLocaleString('en-US', { timeZone: 'America/New_York' }),
        day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day],
        isWeekend,
        timeInHours: timeInHours.toFixed(2),
        isWithinMarketHours,
        finalStatus: reason,
        isOpen,
      });

      return {
        isOpen,
        reason,
        message,
        currentTime: etTime,
      };
    } catch (err) {
      console.error('[Market Status - Fallback] Error:', err);
      return {
        isOpen: false,
        reason: 'outside_hours',
        message: 'Market Closed',
        currentTime: new Date(),
      };
    }
  }, []);

  /**
   * Fetch market status from Polygon API
   * Falls back to JavaScript calculation if API fails
   */
  const checkMarketStatus = useCallback(async () => {
    if (isCheckingRef.current) return;

    isCheckingRef.current = true;

    try {
      const apiKey = import.meta.env.VITE_POLYGON_API_KEY;

      // If no API key, use fallback immediately
      if (!apiKey) {
        console.warn('[Market Status] No Polygon API key found, using fallback calculation');
        const fallbackStatus = checkMarketStatusFallback();
        setStatus(fallbackStatus);
        setError(null);
        return;
      }

      // Check cache first
      const cachedData = localStorage.getItem(CACHE_KEY);
      const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      const now = Date.now();

      if (cachedData && cachedTimestamp) {
        const cacheAge = now - parseInt(cachedTimestamp, 10);
        if (cacheAge < CACHE_TTL_MS) {
          const parsed = JSON.parse(cachedData);
          setStatus(parsed);
          setError(null);
          console.log('[Market Status] Using cached data');
          return;
        }
      }

      // Attempt API call
      const url = `https://api.polygon.io/v1/marketstatus/now?apiKey=${apiKey}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();

      // Parse Polygon API response
      // The API returns status for different markets
      // We're interested in the US stock market
      let isOpen = false;
      let reason = 'outside_hours';
      let message = 'Market Closed';

      // Polygon API structure (based on their docs):
      // { market: "open" | "closed" | "early-close", serverTime: "..." }
      // or { markets: { stocks: "open" | "closed" } }

      if (data.market === 'open' || data.status === 'open') {
        isOpen = true;
        reason = 'open';
        message = 'Market Open';
      } else if (data.markets?.stocks === 'open') {
        isOpen = true;
        reason = 'open';
        message = 'Market Open';
      } else {
        // Market is closed, but we don't know the reason from API
        // Use fallback to determine specific reason
        const fallbackStatus = checkMarketStatusFallback();
        reason = fallbackStatus.reason;
        message = fallbackStatus.message;
      }

      const newStatus = {
        isOpen,
        reason,
        message,
        currentTime: new Date(),
      };

      // Cache the result
      localStorage.setItem(CACHE_KEY, JSON.stringify(newStatus));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, now.toString());

      setStatus(newStatus);
      setError(null);

      console.log('[Market Status - API]', {
        apiResponse: data,
        parsedStatus: newStatus,
      });

    } catch (err) {
      console.warn('[Market Status] API call failed, using fallback:', err.message);

      // Use fallback calculation
      const fallbackStatus = checkMarketStatusFallback();
      setStatus(fallbackStatus);
      setError(null); // Don't show error to user, fallback works fine
    } finally {
      isCheckingRef.current = false;
    }
  }, [checkMarketStatusFallback]);

  // Set up polling on mount
  useEffect(() => {
    checkMarketStatus(); // Check immediately
    setLoading(false);

    pollingIntervalRef.current = setInterval(() => {
      checkMarketStatus();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [checkMarketStatus]);

  return {
    isOpen: status.isOpen,
    reason: status.reason,
    status: status.message,
    currentTime: status.currentTime,
    loading,
    error,
  };
}
