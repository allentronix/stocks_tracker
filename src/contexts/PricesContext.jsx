import { createContext, useContext, useEffect, useState, useRef } from "react";
import { fetchQuote } from "../api/finnhub";
import { API_BASE_URL } from "../config/api";
const PricesContext = createContext(null);

const TOP_TEN_SYMBOLS = [
  "AAPL",
  "MSFT",
  "GOOGL",
  "AMZN",
  "TSLA",
  "NVDA",
  "META",
  "NFLX",
  "INTC",
  "CSCO",
];

const POLL_INTERVAL = 120000; // 2 minutes in milliseconds
const CACHE_KEY = "topTenStocksCache";
const LAST_FETCH_KEY = "topTenLastFetch";
const CACHE_TIMESTAMP_KEY = "topTenCacheTimestamp";

function usePrices() {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true); // Track initial load separately
  const [error, setError] = useState(null);
  const [symbolsSubscribed, setSymbolsSubscribed] = useState([]);
  const [socket, setSocket] = useState(null);

  const [stocks, setStocks] = useState([]);
  const [isMarketOpen, setIsMarketOpen] = useState(false);

  const createdSocketRef = useRef(false);
  useEffect(() => {
    if (createdSocketRef.current) return;
    createdSocketRef.current = true;
    const socket = new WebSocket(
      `wss://ws.finnhub.io?token=${import.meta.env.VITE_FINNHUB_API_KEY}`
    );

    setSocket(socket);
    socket.onopen = () => {
      if (socket.readyState === WebSocket.OPEN) {
        console.log("WebSocket connected");
      }
    };

    socket.addEventListener("error", function () {
      setError(error);
    });
    socket.addEventListener("message", function (event) {
      const data = JSON.parse(event.data);
      console.log("Message from server ", event.data);
      if (data.type === "trade") {
        // Trade stream is currently logged only; symbol-level updates can be added later.
      }
    });
  }, []);

  async function fetchStockDetails(symbol) {
    try {
      const data = await fetchQuote(symbol);
      const formattedData = {
        symbol: symbol,
        currentPrice: data.c,
        previousClose: data.pc,
        change: data.c - data.pc,
        changePercent: ((data.c - data.pc) / data.pc) * 100,
      };
      return formattedData;
    } catch (error) {
      console.error("Error fetching stock details: ", error);
      return null;
    }
  }

  // Load cached stocks from localStorage
  function loadCachedStocks() {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

      if (cached && cacheTimestamp) {
        const cacheAge = Date.now() - parseInt(cacheTimestamp, 10);

        // If market is closed, use cache regardless of age
        // If market is open, only use cache if less than 2 minutes old
        if (!isMarketOpen || cacheAge < POLL_INTERVAL) {
          const stocksData = JSON.parse(cached);
          console.log('[Prices] Using cached data', {
            marketOpen: isMarketOpen,
            cacheAge: Math.floor(cacheAge / 1000) + 's',
          });
          return stocksData;
        }
      }
    } catch (error) {
      console.error("Error loading cached stocks:", error);
    }
    return null;
  }

  // Save stocks to localStorage
  function saveStocksToCache(stocksData) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(stocksData));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      localStorage.setItem(LAST_FETCH_KEY, Date.now().toString());
      console.log('[Prices] Saved to cache');
    } catch (error) {
      console.error("Error saving stocks to cache:", error);
    }
  }

  // Subscribe to shared API-gateway SSE stream
  useEffect(() => {
    const cachedStocks = loadCachedStocks();
    if (cachedStocks && cachedStocks.length > 0) {
      setStocks(cachedStocks);
      setLoading(false);
      setInitialLoad(false);
    }

    const source = new EventSource(`${API_BASE_URL}/api/stream`);

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const nextStocks = Array.isArray(payload?.topTenStocks)
          ? payload.topTenStocks
          : [];

        if (payload?.marketStatus) {
          setIsMarketOpen(Boolean(payload.marketStatus.isOpen));
        }

        if (nextStocks.length > 0) {
          setStocks(nextStocks);
          saveStocksToCache(nextStocks);
        }

        setError(null);
      } catch (streamError) {
        setError(streamError?.message || "Failed to parse price stream");
      } finally {
        if (initialLoad) {
          setLoading(false);
          setInitialLoad(false);
        }
      }
    };

    source.onerror = () => {
      setError("Live price stream disconnected");
      if (initialLoad) {
        setLoading(false);
        setInitialLoad(false);
      }
    };

    return () => {
      source.close();
    };
  }, [initialLoad]);

  const symbolsBeingFetched = [];

  async function subscribeToSymbol(symbol) {
    if (symbolsBeingFetched.includes(symbol)) return;
    symbolsBeingFetched.push(symbol);

    if (symbolsSubscribed.includes(symbol)) return;

    const isStockAlreadyInStocks = stocks.some(
      (stock) => stock.symbol === symbol
    );
    if (!isStockAlreadyInStocks) {
      const stockDetails = await fetchStockDetails(symbol);
      if (stockDetails) {
        setStocks((prevStocks) => [...prevStocks, stockDetails]);
        console.log("Stock details: ", symbol, stockDetails, stocks);
      }
    }

    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log("sockk", socket);
      setSymbolsSubscribed([...symbolsSubscribed, symbol]);
      socket.send(JSON.stringify({ type: "subscribe", symbol: symbol }));
    }
    symbolsBeingFetched.splice(symbolsBeingFetched.indexOf(symbol), 1);
    console.warn("Subscribed to symbol: ", symbol, "Stocks: ", stocks);
  }

  function unsubscribeFromSymbol(symbol) {
    if (!symbolsSubscribed.includes(symbol)) return;
    setSymbolsSubscribed(symbolsSubscribed.filter((s) => s !== symbol));
    if (socket) {
      socket.send(JSON.stringify({ type: "unsubscribe", symbol: symbol }));
    }
    symbolsBeingFetched.splice(symbolsBeingFetched.indexOf(symbol), 1);
  }

  function unsubscribeAll() {
    setSymbolsSubscribed([]);
    socket.send(
      JSON.stringify({
        type: "unsubscribe",
        symbol: symbolsSubscribed.join(","),
      })
    );
  }

  return {
    prices,
    setPrices,
    loading, // Only true on initial load
    stocks,
    subscribeToSymbol,
    unsubscribeFromSymbol,
    unsubscribeAll,
    isMarketOpen, // Expose market status
  };
}
export function PricesProvider({ children }) {
  const prices = usePrices();

  return (
    <PricesContext.Provider value={prices}>{children}</PricesContext.Provider>
  );
}

export function usePricesContext() {
  const context = useContext(PricesContext);
  if (!context) {
    throw new Error("usePricesContext must be used within a PricesProvider");
  }
  return context;
}
