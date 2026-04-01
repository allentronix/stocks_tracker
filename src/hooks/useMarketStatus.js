import { useState, useEffect, useRef, useCallback } from 'react';

const POLL_INTERVAL_MS = 60000; // 60 seconds
const SESSION_CACHE_KEY = 'marketStatus_session'; // sessionStorage key for per-session caching

// API call window: only call Polygon between 9:25 AM and 4:05 PM ET
// This gives a 5-minute buffer before market open (9:30) and after close (4:00)
const API_WINDOW_START = 9 + 25 / 60; // 9:25 AM ET in decimal hours
const API_WINDOW_END = 16 + 5 / 60;   // 4:05 PM ET in decimal hours

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
   * Get current ET time info for decision making
   */
  const getETTimeInfo = useCallback(() => {
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
    const isWeekend = day === 0 || day === 6;

    return { etTime, day, timeInHours, isWeekend };
  }, []);

  /**
   * Check if we should call the Polygon API
   * Only call during possible market hours (9:25 AM - 4:05 PM ET) on weekdays
   */
  const shouldCallAPI = useCallback(() => {
    const { timeInHours, isWeekend } = getETTimeInfo();

    // Never call API on weekends - JS check is sufficient
    if (isWeekend) {
      return false;
    }

    // Only call API within the market hours window (with 5-min buffer)
    // Before 9:25 AM or after 4:05 PM, JS check is sufficient
    return timeInHours >= API_WINDOW_START && timeInHours <= API_WINDOW_END;
  }, [getETTimeInfo]);

  /**
   * Get cached market status from sessionStorage
   * Returns null if no valid cache exists
   */
  const getSessionCache = useCallback(() => {
    try {
      const cached = sessionStorage.getItem(SESSION_CACHE_KEY);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      // Cache is valid for the entire session - no TTL needed
      // The cache stores: { status, checkedAt }
      console.log('[Market Status] Found session cache from:', parsed.checkedAt);
      return parsed.status;
    } catch {
      return null;
    }
  }, []);

  /**
   * Save market status to sessionStorage
   */
  const setSessionCache = useCallback((statusData) => {
    try {
      const cacheData = {
        status: statusData,
        checkedAt: new Date().toISOString(),
      };
      sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cacheData));
      console.log('[Market Status] Cached to sessionStorage');
    } catch (err) {
      console.warn('[Market Status] Failed to cache:', err.message);
    }
  }, []);

  /**
   * Fetch market status from Polygon API
   * Only called when shouldCallAPI() returns true
   * Purpose: Confirm holidays or unexpected closures
   */
  const fetchFromAPI = useCallback(async () => {
    const apiKey = import.meta.env.VITE_POLYGON_API_KEY;
    if (!apiKey) {
      console.warn('[Market Status] No Polygon API key found');
      return null;
    }

    const url = `https://api.polygon.io/v1/marketstatus/now?apiKey=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    console.log('[Market Status - API] Response:', data);

    // Parse Polygon API response
    // Polygon API structure: { market: "open" | "closed" | "early-close" }
    // or { markets: { stocks: "open" | "closed" } }
    let isOpen = false;
    if (data.market === 'open' || data.status === 'open' || data.markets?.stocks === 'open') {
      isOpen = true;
    }

    return isOpen;
  }, []);

  /**
   * Main function to check market status
   * Uses JS time checks first, only calls API when necessary
   */
  const checkMarketStatus = useCallback(async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      // Step 1: Always calculate JS-based status first (handles weekends & outside hours)
      const jsStatus = checkMarketStatusFallback();

      // Step 2: If weekend or clearly outside hours, use JS status directly (no API needed)
      if (jsStatus.reason === 'weekend' || jsStatus.reason === 'outside_hours') {
        console.log('[Market Status] Using JS check (no API needed):', jsStatus.reason);
        setStatus(jsStatus);
        setError(null);
        return;
      }

      // Step 3: We're in possible market hours - check session cache first
      const cachedStatus = getSessionCache();
      if (cachedStatus) {
        console.log('[Market Status] Using session cache');
        setStatus(cachedStatus);
        setError(null);
        return;
      }

      // Step 4: Check if we should call the API (within API window)
      if (!shouldCallAPI()) {
        console.log('[Market Status] Outside API window, using JS status');
        setStatus(jsStatus);
        setError(null);
        return;
      }

      // Step 5: Call Polygon API to confirm market status (handles holidays)
      console.log('[Market Status] Calling Polygon API to confirm status...');
      const apiIsOpen = await fetchFromAPI();

      let finalStatus;
      if (apiIsOpen === null) {
        // API unavailable, use JS fallback
        finalStatus = jsStatus;
      } else if (apiIsOpen) {
        finalStatus = {
          isOpen: true,
          reason: 'open',
          message: 'Market Open',
          currentTime: new Date(),
        };
      } else {
        // API says closed but JS says should be open = likely a holiday
        finalStatus = {
          isOpen: false,
          reason: 'holiday',
          message: 'Market Closed (Holiday)',
          currentTime: new Date(),
        };
      }

      // Cache the confirmed status for this session
      setSessionCache(finalStatus);
      setStatus(finalStatus);
      setError(null);

    } catch (err) {
      console.warn('[Market Status] API call failed, using fallback:', err.message);
      const fallbackStatus = checkMarketStatusFallback();
      setStatus(fallbackStatus);
      setError(null);
    } finally {
      isCheckingRef.current = false;
    }
  }, [checkMarketStatusFallback, getSessionCache, setSessionCache, shouldCallAPI, fetchFromAPI]);

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
