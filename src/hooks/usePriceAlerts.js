import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const ALERTS_KEY = "priceAlerts";
const TRIGGERED_ALERTS_KEY = "triggeredPriceAlerts";
const POLL_INTERVAL_MS = 30000; // 30 seconds as requested
const MAX_ALERTS = 3;
const TWELVE_DATA_API_KEY =
  import.meta.env.VITE_TWELVE_DATA_KEY || "YOUR_TWELVE_DATA_KEY";

// Load alerts from localStorage on startup
const loadAlertsFromStorage = () => {
  try {
    const stored = localStorage.getItem(ALERTS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((alert) => ({
        id: alert.id,
        symbol: String(alert.symbol || "").toUpperCase(),
        targetPrice: Number(alert.targetPrice),
        condition: alert.condition === "below" ? "below" : "above",
        lastPrice: alert.lastPrice ? Number(alert.lastPrice) : null, // Track last known price
      }))
      .filter(
        (alert) =>
          alert.id &&
          alert.symbol &&
          !Number.isNaN(alert.targetPrice) &&
          isFinite(alert.targetPrice)
      );
  } catch (error) {
    console.error("Failed to read alerts from storage", error);
    return [];
  }
};

// Load triggered alerts from localStorage
const loadTriggeredAlertsFromStorage = () => {
  try {
    const stored = localStorage.getItem(TRIGGERED_ALERTS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((alert) => ({
        id: alert.id,
        symbol: String(alert.symbol || "").toUpperCase(),
        targetPrice: Number(alert.targetPrice),
        condition: alert.condition === "below" ? "below" : "above",
        currentPrice: Number(alert.currentPrice),
      }))
      .filter(
        (alert) =>
          alert.id &&
          alert.symbol &&
          !Number.isNaN(alert.targetPrice) &&
          isFinite(alert.targetPrice) &&
          !Number.isNaN(alert.currentPrice) &&
          isFinite(alert.currentPrice)
      );
  } catch (error) {
    console.error("Failed to read triggered alerts from storage", error);
    return [];
  }
};

export function usePriceAlerts() {
  // 1. Load alerts from localStorage on startup
  const [alerts, setAlerts] = useState(() => loadAlertsFromStorage());
  const [triggeredAlerts, setTriggeredAlerts] = useState(() =>
    loadTriggeredAlertsFromStorage()
  );
  const [notificationStatus, setNotificationStatus] = useState(
    () => (typeof Notification !== "undefined" ? Notification.permission : "denied")
  );

  // Use refs to avoid unnecessary re-renders and ensure we always have latest values
  const alertsRef = useRef(alerts);
  const triggeredAlertsRef = useRef(triggeredAlerts);
  const intervalRef = useRef(null);
  const isCheckingRef = useRef(false); // Prevent concurrent checks

  // Keep refs in sync with state
  useEffect(() => {
    alertsRef.current = alerts;
  }, [alerts]);

  useEffect(() => {
    triggeredAlertsRef.current = triggeredAlerts;
  }, [triggeredAlerts]);

  // Request notification permission
  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      Notification.requestPermission().then((result) => {
        setNotificationStatus(result);
      });
    } else {
      setNotificationStatus(Notification.permission);
    }
  }, []);

  // Persist alerts to localStorage and state
  const persistAlerts = useCallback((nextAlerts) => {
    setAlerts(nextAlerts);
    alertsRef.current = nextAlerts;
    try {
      localStorage.setItem(ALERTS_KEY, JSON.stringify(nextAlerts));
    } catch (error) {
      console.error("Failed to save alerts", error);
    }
  }, []);

  // Persist triggered alerts to localStorage and state
  const persistTriggeredAlerts = useCallback((nextTriggeredAlerts) => {
    setTriggeredAlerts(nextTriggeredAlerts);
    triggeredAlertsRef.current = nextTriggeredAlerts;
    try {
      localStorage.setItem(TRIGGERED_ALERTS_KEY, JSON.stringify(nextTriggeredAlerts));
    } catch (error) {
      console.error("Failed to save triggered alerts", error);
    }
  }, []);

  // Browser notification function
  const notify = useCallback((title, body) => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    try {
      new Notification(title, { body });
    } catch (error) {
      console.error("Failed to show notification", error);
    }
  }, []);

  // 2. Fetch latest prices from Twelve API and check conditions
  // 3. Check each alert to see if price crosses target
  // 4. Trigger notification immediately if condition is met
  // 5. Ensure each alert only triggers once per crossing
  const checkAlerts = useCallback(async () => {
    // Prevent concurrent checks
    if (isCheckingRef.current) {
      return;
    }

    const currentAlerts = alertsRef.current;
    if (!currentAlerts.length) {
      return;
    }

    if (!TWELVE_DATA_API_KEY || TWELVE_DATA_API_KEY === "YOUR_TWELVE_DATA_KEY") {
      console.warn("Add your Twelve Data API key to enable price alerts.");
      return;
    }

    isCheckingRef.current = true;

    try {
      // Get unique symbols
      const symbols = [...new Set(currentAlerts.map((alert) => alert.symbol))];
      const url = `https://api.twelvedata.com/price?symbol=${symbols.join(
        ","
      )}&apikey=${TWELVE_DATA_API_KEY}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();

      // Handle API errors
      if (data.status === "error" || data.code) {
        console.error("Twelve Data API error:", data.message || data);
        return;
      }

      // Extract price for a symbol (handles different response formats)
      const getPriceForSymbol = (symbol) => {
        // Try multiple possible response formats
        const entry = data?.[symbol] || data?.[symbol.toUpperCase()] || data;
        
        if (entry && typeof entry.price !== "undefined") {
          const parsed = Number(entry.price);
          return Number.isNaN(parsed) ? null : parsed;
        }
        
        // If it's a single symbol response, try direct access
        if (data.price !== undefined) {
          const parsed = Number(data.price);
          return Number.isNaN(parsed) ? null : parsed;
        }
        
        return null;
      };

      const newlyTriggered = [];
      const updatedAlerts = [];

      // 3. Check each alert for price crossing
      currentAlerts.forEach((alert) => {
        const currentPrice = getPriceForSymbol(alert.symbol);
        
        if (currentPrice === null) {
          // Price not available, keep alert as-is
          updatedAlerts.push(alert);
          return;
        }

        const lastPrice = alert.lastPrice;
        const meetsCondition =
          alert.condition === "above"
            ? currentPrice >= alert.targetPrice
            : currentPrice <= alert.targetPrice;

        // 5. Only trigger if this is a NEW crossing (price just crossed the threshold)
        // We check if:
        // - Condition is met now AND
        // - Either we don't have a lastPrice (first check) OR
        // - Last price was on the other side of the threshold
        const wasOnOtherSide =
          lastPrice === null ||
          (alert.condition === "above"
            ? lastPrice < alert.targetPrice
            : lastPrice > alert.targetPrice);

        if (meetsCondition && wasOnOtherSide) {
          // 4. Trigger notification immediately
          newlyTriggered.push({
            id: alert.id,
            symbol: alert.symbol,
            targetPrice: alert.targetPrice,
            condition: alert.condition,
            currentPrice: currentPrice,
          });

          // Show browser notification
          const message = `${alert.symbol} is ${alert.condition} $${alert.targetPrice.toFixed(2)}`;
          notify(`${alert.symbol} Alert`, message);
        } else {
          // Update alert with new price but keep it active
          updatedAlerts.push({
            ...alert,
            lastPrice: currentPrice,
          });
        }
      });

      // 6. Keep localStorage in sync
      if (newlyTriggered.length > 0) {
        // Remove triggered alerts from active list
        persistAlerts(updatedAlerts);

        // Add to triggered alerts list (only if not already there)
        const existingTriggeredIds = new Set(
          triggeredAlertsRef.current.map((a) => a.id)
        );
        const uniqueNewTriggers = newlyTriggered.filter(
          (alert) => !existingTriggeredIds.has(alert.id)
        );

        if (uniqueNewTriggers.length > 0) {
          const updatedTriggeredAlerts = [
            ...triggeredAlertsRef.current,
            ...uniqueNewTriggers,
          ];
          persistTriggeredAlerts(updatedTriggeredAlerts);
        }
      } else if (updatedAlerts.length !== currentAlerts.length) {
        // Update alerts with new prices even if none triggered
        persistAlerts(updatedAlerts);
      } else {
        // Update prices in alerts without triggering state change if no changes
        const hasPriceUpdates = updatedAlerts.some((alert, idx) => {
          const oldAlert = currentAlerts[idx];
          return oldAlert && alert.lastPrice !== oldAlert.lastPrice;
        });
        if (hasPriceUpdates) {
          persistAlerts(updatedAlerts);
        }
      }
    } catch (error) {
      console.error("Failed to check price alerts:", error);
    } finally {
      isCheckingRef.current = false;
    }
  }, [notify, persistAlerts, persistTriggeredAlerts]);

  // 2. Poll every 30 seconds
  // 7. Use React hooks efficiently, avoid unnecessary re-renders
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const currentAlerts = alertsRef.current;
    if (!currentAlerts.length) {
      return;
    }

    // Run check immediately on mount or when alerts change
    checkAlerts();

    // Set up polling interval (30 seconds)
    intervalRef.current = setInterval(() => {
      checkAlerts();
    }, POLL_INTERVAL_MS);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [alerts.length, checkAlerts]); // Only depend on alerts.length, not the entire alerts array

  // Add alert function
  const addAlert = useCallback(
    ({ symbol, targetPrice, condition }) => {
      const normalizedSymbol = String(symbol || "").trim().toUpperCase();
      const parsedTarget = Number(targetPrice);
      
      if (!normalizedSymbol) {
        return { ok: false, error: "Symbol is required." };
      }
      if (Number.isNaN(parsedTarget) || !isFinite(parsedTarget)) {
        return { ok: false, error: "Enter a valid target price." };
      }
      if (alertsRef.current.length >= MAX_ALERTS) {
        return { ok: false, error: `Maximum of ${MAX_ALERTS} alerts reached.` };
      }

      const newAlert = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        symbol: normalizedSymbol,
        targetPrice: parsedTarget,
        condition: condition === "below" ? "below" : "above",
        lastPrice: null, // No previous price on creation
      };

      const nextAlerts = [...alertsRef.current, newAlert];
      persistAlerts(nextAlerts);

      // Trigger immediate check for the new alert
      setTimeout(() => {
        checkAlerts();
      }, 1000); // Small delay to ensure state is updated

      return { ok: true };
    },
    [persistAlerts, checkAlerts]
  );

  // Remove alert function
  const removeAlert = useCallback(
    (id) => {
      const nextAlerts = alertsRef.current.filter((alert) => alert.id !== id);
      persistAlerts(nextAlerts);
    },
    [persistAlerts]
  );

  // Dismiss triggered alert function
  const dismissTriggeredAlert = useCallback(
    (id) => {
      const nextTriggeredAlerts = triggeredAlertsRef.current.filter(
        (alert) => alert.id !== id
      );
      persistTriggeredAlerts(nextTriggeredAlerts);
    },
    [persistTriggeredAlerts]
  );

  // Memoized remaining slots
  const remainingSlots = useMemo(
    () => Math.max(0, MAX_ALERTS - alerts.length),
    [alerts.length]
  );

  return {
    alerts,
    triggeredAlerts,
    addAlert,
    removeAlert,
    dismissTriggeredAlert,
    remainingSlots,
    notificationStatus,
  };
}
