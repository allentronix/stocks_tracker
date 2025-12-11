import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const ALERTS_KEY = "priceAlerts";
const POLL_INTERVAL_MS = 15000;
const MAX_ALERTS = 3;
const TWELVE_DATA_API_KEY =
  import.meta.env.VITE_TWELVE_DATA_KEY || "YOUR_TWELVE_DATA_KEY";

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

export function usePriceAlerts() {
  const [alerts, setAlerts] = useState(() => loadAlertsFromStorage());
  const [notificationStatus, setNotificationStatus] = useState(
    () => (typeof Notification !== "undefined" ? Notification.permission : "denied")
  );
  const latestAlertsRef = useRef(alerts);
  latestAlertsRef.current = alerts;

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

  const persistAlerts = useCallback((next) => {
    setAlerts(next);
    try {
      localStorage.setItem(ALERTS_KEY, JSON.stringify(next));
    } catch (error) {
      console.error("Failed to save alerts", error);
    }
  }, []);

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
      if (latestAlertsRef.current.length >= MAX_ALERTS) {
        return { ok: false, error: `Maximum of ${MAX_ALERTS} alerts reached.` };
      }

      const newAlert = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
        symbol: normalizedSymbol,
        targetPrice: parsedTarget,
        condition: condition === "below" ? "below" : "above",
      };

      const nextAlerts = [...latestAlertsRef.current, newAlert];
      persistAlerts(nextAlerts);
      return { ok: true };
    },
    [persistAlerts]
  );

  const removeAlert = useCallback(
    (id) => {
      const nextAlerts = latestAlertsRef.current.filter((alert) => alert.id !== id);
      persistAlerts(nextAlerts);
    },
    [persistAlerts]
  );

  const notify = useCallback((title, body) => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    try {
      new Notification(title, { body });
    } catch (error) {
      console.error("Failed to show notification", error);
    }
  }, []);

  const checkAlerts = useCallback(async () => {
    const currentAlerts = latestAlertsRef.current;
    if (!currentAlerts.length) return;
    if (!TWELVE_DATA_API_KEY || TWELVE_DATA_API_KEY === "YOUR_TWELVE_DATA_KEY") {
      console.warn("Add your Twelve Data API key to enable price alerts.");
      return;
    }

    const symbols = [...new Set(currentAlerts.map((alert) => alert.symbol))];
    const url = `https://api.twelvedata.com/price?symbol=${symbols.join(
      ","
    )}&apikey=${TWELVE_DATA_API_KEY}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      const getPriceForSymbol = (symbol) => {
        const entry = data?.[symbol] || data?.[symbol.toUpperCase()] || data;
        if (entry && typeof entry.price !== "undefined") {
          const parsed = Number(entry.price);
          return Number.isNaN(parsed) ? null : parsed;
        }
        return null;
      };

      const triggered = [];
      currentAlerts.forEach((alert) => {
        const price = getPriceForSymbol(alert.symbol);
        if (price === null) return;
        const meetsCondition =
          alert.condition === "above"
            ? price >= alert.targetPrice
            : price <= alert.targetPrice;
        if (meetsCondition) {
          triggered.push({ alert, price });
        }
      });

      if (triggered.length) {
        triggered.forEach(({ alert, price }) => {
          notify(
            `${alert.symbol} alert hit`,
            `Current: $${price.toFixed(2)} (${alert.condition} $${alert.targetPrice})`
          );
        });
        const remaining = currentAlerts.filter(
          (alert) => !triggered.some((item) => item.alert.id === alert.id)
        );
        persistAlerts(remaining);
      }
    } catch (error) {
      console.error("Failed to check price alerts", error);
    }
  }, [notify, persistAlerts]);

  useEffect(() => {
    if (!alerts.length) return;
    const interval = setInterval(checkAlerts, POLL_INTERVAL_MS);
    checkAlerts();
    return () => clearInterval(interval);
  }, [alerts.length, checkAlerts]);

  const remainingSlots = useMemo(
    () => Math.max(0, MAX_ALERTS - alerts.length),
    [alerts.length]
  );

  return {
    alerts,
    addAlert,
    removeAlert,
    remainingSlots,
    notificationStatus,
  };
}


