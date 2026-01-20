import { createContext, useContext, useEffect, useState, useRef } from "react";
import { fetchQuote } from "../api/finnhub";
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

function usePrices() {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [symbolsSubscribed, setSymbolsSubscribed] = useState([]);
  const [socket, setSocket] = useState(null);

  const [stocks, setStocks] = useState([]);
  const pollingIntervalRef = useRef(null);

  let createdSocket = false;
  useEffect(() => {
    if (createdSocket) return;
    createdSocket = true;
    setLoading(true);
    const socket = new WebSocket(
      `wss://ws.finnhub.io?token=${import.meta.env.VITE_FINNHUB_API_KEY}`
    );

    setSocket(socket);
    socket.onopen = () => {
      if (socket.readyState === WebSocket.OPEN) {
        setLoading(false);
        console.log("WebSocket connected");
      }
    };
    socket.addEventListener("open", function (event) {
      //   setLoading(false);
    });

    socket.addEventListener("error", function (event) {
      setError(error);
      //   setLoading(false);
    });
    socket.addEventListener("message", function (event) {
      const data = JSON.parse(event.data);
      //   if (
      //     ["connected", "ping"].includes(data.type) &&
      //     socket.readyState === WebSocket.OPEN
      //   ) {
      //     setLoading(false);
      //   }
      console.log("Message from server ", event.data);
      if (data.type === "trade") {
        const lastTrade = data.data[data.data.length - 1];
        const { s: symbol, p: price, t: timestamp, v: volume } = lastTrade;
        // setStocks((prevStocks) =>
        //   prevStocks.map((stock) =>
        //     stock.symbol === symbol
        //       ? {
        //           ...stock,
        //           currentPrice: price,
        //           timestamp: timestamp,
        //           volume: volume,
        //         }
        //       : stock
        //   )
        // );
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
      if (cached) {
        const stocksData = JSON.parse(cached);
        return stocksData;
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
      localStorage.setItem(LAST_FETCH_KEY, Date.now().toString());
    } catch (error) {
      console.error("Error saving stocks to cache:", error);
    }
  }

  // Check if we should fetch (2 minutes have passed since last fetch)
  function shouldFetch() {
    try {
      const lastFetch = localStorage.getItem(LAST_FETCH_KEY);
      if (!lastFetch) return true;
      const timeSinceLastFetch = Date.now() - parseInt(lastFetch, 10);
      return timeSinceLastFetch >= POLL_INTERVAL;
    } catch (error) {
      console.error("Error checking fetch condition:", error);
      return true;
    }
  }

  // Fetch top 10 stocks and update state
  async function fetchTopTenStocks() {
    try {
      setLoading(true);
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
    } catch (error) {
      console.error("Error fetching top ten stocks:", error);
      setError("Failed to fetch stock data");
    } finally {
      setLoading(false);
    }
  }

  // Set up polling for top 10 stocks
  useEffect(() => {
    // Load cached data on mount
    const cachedStocks = loadCachedStocks();
    if (cachedStocks && cachedStocks.length > 0) {
      setStocks(cachedStocks);
      setLoading(false); // Set loading to false if we have cached data
    }

    let timeoutId = null;

    // Check if we should fetch immediately
    if (shouldFetch()) {
      fetchTopTenStocks();
      // Set up interval for regular polling
      pollingIntervalRef.current = setInterval(() => {
        fetchTopTenStocks();
      }, POLL_INTERVAL);
    } else {
      // Calculate time until next fetch
      const lastFetch = parseInt(
        localStorage.getItem(LAST_FETCH_KEY) || "0",
        10
      );
      const timeSinceLastFetch = Date.now() - lastFetch;
      const timeUntilNextFetch = POLL_INTERVAL - timeSinceLastFetch;

      // Schedule fetch when interval expires
      timeoutId = setTimeout(() => {
        fetchTopTenStocks();
        // Set up interval for subsequent fetches after first delayed fetch
        pollingIntervalRef.current = setInterval(() => {
          fetchTopTenStocks();
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
  }, []);

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
    loading,
    stocks,
    subscribeToSymbol,
    unsubscribeFromSymbol,
    unsubscribeAll,
    fetchTopTenStocks, // Expose for manual refresh if needed
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

// type
// Message type.

// data
// List of trades or price updates.

// s
// Symbol.

// p
// Last price.

// t
// UNIX milliseconds timestamp.

// v
// Volume.

// c
// List of trade conditions. A comprehensive list of trade conditions code can be found here

// {
//   "data": [
//     {
//       "p": 7296.89,
//       "s": "BINANCE:BTCUSDT",
//       "t": 1575526691134,
//       "v": 0.011467
//     }
//   ],
//   "type": "trade"
// }
