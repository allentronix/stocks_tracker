import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiGet } from "../config/api";
import { usePricesContext } from "../contexts/PricesContext";
import { formatMoney } from "../utils/format";

const ALERTS_KEY = "priceAlerts";
const TRIGGERED_ALERTS_KEY = "triggeredPriceAlerts";
const POLL_INTERVAL_MS = 60000; // matches the gateway quote cache
const MAX_ALERTS = 3;

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
        currency: typeof alert.currency === "string" ? alert.currency : "USD",
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
        currency: typeof alert.currency === "string" ? alert.currency : "USD",
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
  const { isMarketOpen } = usePricesContext();
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

  // Ask for notification permission only when the user creates an alert —
  // prompting on page load is blocked or penalised by browsers.
  const requestNotificationPermission = useCallback(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      Notification.requestPermission()
        .then((result) => setNotificationStatus(result))
        .catch(() => {});
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

  // 2. Fetch latest prices from the API gateway and check conditions
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

    isCheckingRef.current = true;

    try {
      // Get unique symbols; the gateway serves cached Finnhub quotes, so
      // this shares upstream calls with the watchlist and top 10.
      const symbols = [...new Set(currentAlerts.map((alert) => alert.symbol))];
      const data = await apiGet(
        `quotes?symbols=${encodeURIComponent(symbols.join(","))}`
      );

      const priceBySymbol = new Map(
        (data?.quotes || []).map((q) => [q.symbol, q.currentPrice])
      );
      const getPriceForSymbol = (symbol) => {
        const price = priceBySymbol.get(symbol);
        return typeof price === "number" && !Number.isNaN(price) ? price : null;
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
            currency: alert.currency,
          });

          // Show browser notification
          const message = `${alert.symbol} is ${alert.condition} ${formatMoney(alert.targetPrice, alert.currency)}`;
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

  // 2. Poll every minute while the market is open (prices are frozen when closed)
  // 7. Use React hooks efficiently, avoid unnecessary re-renders
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const currentAlerts = alertsRef.current;
    if (!currentAlerts.length || !isMarketOpen) {
      return;
    }

    // Run check immediately on mount or when alerts change
    checkAlerts();

    // Set up polling interval (1 minute)
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
  }, [alerts.length, checkAlerts, isMarketOpen]); // Only depend on alerts.length, not the entire alerts array

  // Add alert function
  const addAlert = useCallback(
    ({ symbol, targetPrice, condition, currency }) => {
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
        currency: currency || "USD",
      };

      const nextAlerts = [...alertsRef.current, newAlert];
      persistAlerts(nextAlerts);
      requestNotificationPermission();

      // Trigger immediate check for the new alert
      setTimeout(() => {
        checkAlerts();
      }, 1000); // Small delay to ensure state is updated

      return { ok: true };
    },
    [persistAlerts, checkAlerts, requestNotificationPermission]
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

/** Human-readable sentence for a Notification.permission value. */
export function describeNotificationStatus(status) {
  if (status === "granted") return "Browser notifications are on.";
  if (status === "denied") {
    return "Browser notifications are blocked — allow them in your browser's site settings to get pop-up alerts.";
  }
  return "You'll be asked to allow browser notifications when you add an alert.";
}
