import { createContext, useContext, useEffect, useState } from "react";
import { apiGet } from "../config/api";

const PricesContext = createContext(null);

const POLL_INTERVAL = 60000; // 1 minute (the gateway caches upstream calls)
const CACHE_KEY = "topTenStocksCache";
const CACHE_TIMESTAMP_KEY = "topTenCacheTimestamp";

const DEFAULT_MARKET_STATUS = {
  isOpen: false,
  reason: "outside_hours",
  message: "Market Closed",
  currentTime: null,
};

// Load cached stocks from localStorage so the table renders instantly.
function loadCachedStocks() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const stocksData = JSON.parse(cached);
      if (Array.isArray(stocksData)) return stocksData;
    }
  } catch (error) {
    console.error("Error loading cached stocks:", error);
  }
  return [];
}

function saveStocksToCache(stocksData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(stocksData));
    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.error("Error saving stocks to cache:", error);
  }
}

function usePrices() {
  const [stocks, setStocks] = useState(loadCachedStocks);
  const [loading, setLoading] = useState(() => stocks.length === 0);
  const [error, setError] = useState(null);
  const [marketStatus, setMarketStatus] = useState(DEFAULT_MARKET_STATUS);
  const [marketStatusLoading, setMarketStatusLoading] = useState(true);
  /** True while the last request to the API gateway succeeded. */
  const [gatewayLive, setGatewayLive] = useState(false);

  // Poll the shared API-gateway snapshot (market status + top 10 quotes).
  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const payload = await apiGet("snapshot");
        if (cancelled) return;

        if (payload?.marketStatus) setMarketStatus(payload.marketStatus);

        const nextStocks = Array.isArray(payload?.topTenStocks)
          ? payload.topTenStocks
          : [];
        if (nextStocks.length > 0) {
          setStocks(nextStocks);
          saveStocksToCache(nextStocks);
        }

        setGatewayLive(true);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setGatewayLive(false);
        setError(err.message || "Failed to load prices");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setMarketStatusLoading(false);
        }
      }
    }

    refresh();
    const intervalId = setInterval(refresh, POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  return {
    loading, // Only true until the first response when there is no cache
    error,
    stocks,
    marketStatus,
    marketStatusLoading,
    isMarketOpen: Boolean(marketStatus.isOpen),
    gatewayLive,
  };
}

export function PricesProvider({ children }) {
  const prices = usePrices();

  return (
    <PricesContext.Provider value={prices}>{children}</PricesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePricesContext() {
  const context = useContext(PricesContext);
  if (!context) {
    throw new Error("usePricesContext must be used within a PricesProvider");
  }
  return context;
}
