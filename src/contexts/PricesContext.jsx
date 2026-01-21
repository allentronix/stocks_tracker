import { createContext, useContext, useEffect, useState, useRef } from "react";
import { fetchQuote } from "../api/finnhub";
import { useMarketStatus } from "../hooks/useMarketStatus";
const PricesContext = createContext(null);

const stockDeets = {
  symbol: "",
  currentPrice: 0,
  previousClose: 0,
  change: 0,
  changePercent: 0,
};

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
const CACHE_TTL = 86400000; // 24 hours cache for closed market data

function usePrices() {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true); // Track initial load separately
  const [error, setError] = useState(null);
  const [symbolsSubscribed, setSymbolsSubscribed] = useState([]);
  const [socket, setSocket] = useState(null);

  const [stocks, setStocks] = useState([]);
  const pollingIntervalRef = useRef(null);
  const { isOpen: isMarketOpen } = useMarketStatus();

  let createdSocket = false;
  useEffect(() => {
    if (createdSocket) return;
    createdSocket = true;
    const socket = new WebSocket(
      `wss://ws.finnhub.io?token=${import.meta.env.VITE_FINNHUB_API_KEY}`
    );

    setSocket(socket);
    socket.onopen = () => {
      if (socket.readyState === WebSocket.OPEN) {
        console.log("WebSocket connected");
      }
    };

    socket.addEventListener("error", function (event) {
      setError(error);
    });
    socket.addEventListener("message", function (event) {
      const data = JSON.parse(event.data);
      console.log("Message from server ", event.data);
      if (data.type === "trade") {
        const lastTrade = data.data[data.data.length - 1];
        const { s: symbol, p: price, t: timestamp, v: volume } = lastTrade;
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

  // Check if we should fetch (only if market is open)
  function shouldFetch() {
    // Never fetch if market is closed
    if (!isMarketOpen) {
      console.log('[Prices] Market closed - skipping fetch');
      return false;
    }

    try {
      const lastFetch = localStorage.getItem(LAST_FETCH_KEY);
      if (!lastFetch) return true;
      const timeSinceLastFetch = Date.now() - parseInt(lastFetch, 10);
      const shouldFetchNow = timeSinceLastFetch >= POLL_INTERVAL;

      console.log('[Prices] Should fetch check:', {
        marketOpen: isMarketOpen,
        timeSinceLast: Math.floor(timeSinceLastFetch / 1000) + 's',
        shouldFetch: shouldFetchNow
      });

      return shouldFetchNow;
    } catch (error) {
      console.error("Error checking fetch condition:", error);
      return true;
    }
  }

  // Fetch top 10 stocks and update state
  async function fetchTopTenStocks(isInitial = false) {
    try {
      // Only show loading spinner on initial load
      if (isInitial) {
        setLoading(true);
      }

      console.log('[Prices] Fetching stock data', { isInitial, marketOpen: isMarketOpen });

      const stockPromises = TOP_TEN_SYMBOLS.map((symbol) =>
        fetchStockDetails(symbol)
      );
      const results = await Promise.all(stockPromises);
      const validStocks = results.filter((stock) => stock !== null);

      // Update stocks by replacing existing entries or adding new ones
      setStocks((prevStocks) => {
        const updatedStocks = [...prevStocks];
        validStocks.forEach((newStock) => {
          const existingIndex = updatedStocks.findIndex(
            (stock) => stock.symbol === newStock.symbol
          );
          if (existingIndex >= 0) {
            // Update existing stock
            updatedStocks[existingIndex] = newStock;
          } else {
            // Add new stock
            updatedStocks.push(newStock);
          }
        });
        // Ensure we only have the top 10 symbols, in order
        const symbolSet = new Set(TOP_TEN_SYMBOLS);
        return updatedStocks
          .filter((stock) => symbolSet.has(stock.symbol))
          .sort((a, b) => {
            const indexA = TOP_TEN_SYMBOLS.indexOf(a.symbol);
            const indexB = TOP_TEN_SYMBOLS.indexOf(b.symbol);
            return indexA - indexB;
          });
      });

      // Save to cache
      saveStocksToCache(validStocks);
      setError(null);

      console.log('[Prices] Successfully updated stock data');
    } catch (error) {
      console.error("Error fetching top ten stocks:", error);
      setError("Failed to fetch stock data");
    } finally {
      if (isInitial) {
        setLoading(false);
        setInitialLoad(false);
      }
    }
  }

  // Set up polling for top 10 stocks based on market status
  useEffect(() => {
    console.log('[Prices] Market status changed:', { isMarketOpen });

    // Load cached data on mount
    const cachedStocks = loadCachedStocks();
    if (cachedStocks && cachedStocks.length > 0) {
      setStocks(cachedStocks);
      setLoading(false);
      setInitialLoad(false);
    }

    // Clear any existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    let timeoutId = null;

    // If market is closed, only load from cache and stop
    if (!isMarketOpen) {
      console.log('[Prices] Market closed - using cached data only');

      // If no cache exists, fetch once
      if (!cachedStocks || cachedStocks.length === 0) {
        console.log('[Prices] No cache found, fetching once');
        fetchTopTenStocks(true);
      }

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
      };
    }

    // Market is open - set up polling
    console.log('[Prices] Market open - setting up polling');

    // Check if we should fetch immediately
    if (shouldFetch() || !cachedStocks) {
      fetchTopTenStocks(initialLoad);

      // Set up interval for regular polling
      pollingIntervalRef.current = setInterval(() => {
        fetchTopTenStocks(false); // Never show loading on auto-refresh
      }, POLL_INTERVAL);
    } else {
      // Calculate time until next fetch
      const lastFetch = parseInt(
        localStorage.getItem(LAST_FETCH_KEY) || "0",
        10
      );
      const timeSinceLastFetch = Date.now() - lastFetch;
      const timeUntilNextFetch = POLL_INTERVAL - timeSinceLastFetch;

      console.log('[Prices] Scheduling next fetch in', Math.floor(timeUntilNextFetch / 1000) + 's');

      // Schedule fetch when interval expires
      timeoutId = setTimeout(() => {
        fetchTopTenStocks(false);

        // Set up interval for subsequent fetches
        pollingIntervalRef.current = setInterval(() => {
          fetchTopTenStocks(false);
        }, POLL_INTERVAL);
      }, timeUntilNextFetch);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isMarketOpen]); // Re-run when market status changes

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
    fetchTopTenStocks, // Expose for manual refresh if needed
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
