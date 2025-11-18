import { fetchQuote } from "../api/finnhub";
import { useState, useEffect } from "react";

export default function TopTen({ onStockSelect }) {
  const [stocks, setStocks] = useState([]);
  const topTenSymbols = [
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
  const refreshInterval = 60000; // 1 minute
  const CACHE_KEY = "topTenStocks";
  const CACHE_DURATION = 60000; // 1 minute in milliseconds

  // Load cached data from localStorage
  const loadCachedData = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();
        // Check if cache is still valid (less than 1 minute old)
        if (now - timestamp < CACHE_DURATION) {
          return data;
        }
      }
    } catch (error) {
      console.error("Error loading cached data:", error);
    }
    return null;
  };

  // Save data to localStorage
  const saveToCache = (data) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error("Error saving to cache:", error);
    }
  };

  useEffect(() => {
    let isMounted = true; // avoid state update on unmounted component

    async function loadTopStocks() {
      const results = [];
      for (let symbol of topTenSymbols) {
        const data = await fetchQuote(symbol);
        results.push({ symbol, price: data.c, change: data.c - data.pc });
      }
      if (isMounted) {
        setStocks(results);
        saveToCache(results); // Save to cache after fetching
      }
    }

    // Try to load from cache first
    const cachedData = loadCachedData();
    if (cachedData) {
      setStocks(cachedData);
      // Calculate when to refresh based on cache age
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { timestamp } = JSON.parse(cached);
          const cacheAge = Date.now() - timestamp;
          const timeUntilRefresh = CACHE_DURATION - cacheAge;
          if (timeUntilRefresh > 0) {
            // Schedule refresh when cache expires
            setTimeout(() => {
              if (isMounted) loadTopStocks();
            }, timeUntilRefresh);
          } else {
            // Cache is expired, fetch immediately
            loadTopStocks();
          }
        }
      } catch (error) {
        // If there's an error reading cache, just fetch immediately
        loadTopStocks();
      }
    } else {
      // No cache, fetch immediately
      loadTopStocks();
    }

    // Set up interval to refresh every minute
    const interval = setInterval(() => {
      if (isMounted) loadTopStocks();
    }, refreshInterval);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-center">Top 10 Stocks</h2>
      <div className="stock-grid">
        {stocks.length === 0 ? (
          <button
            type="button"
            className="bg-red-300 text-gray-900 flex items-center justify-center p-4 rounded-md"
            disabled
          >
            <svg
              className="mr-3 -ml-1 size-5 animate-spin text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Loading...
          </button>
        ) : (
          <table className="min-w-full text-sm text-gray-400">
            <thead className="bg-gray-800 text-xs uppercase font-medium">
              <tr>
                <th scope="col" className="px-6 py-3 text-left tracking-wider">
                  Symbol
                </th>
                <th scope="col" className="px-6 py-3 text-left tracking-wider">
                  Price
                </th>
                <th scope="col" className="px-6 py-3 text-left tracking-wider">
                  Change
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800">
              {stocks.map((stock) => (
                <tr key={stock.symbol} className="bg-black bg-opacity-20">
                  <td
                    className="font-bold flex px-6 py-4 whitespace-nowrap cursor-pointer hover:text-blue-400 transition-colors"
                    onClick={() => onStockSelect({ symbol: stock.symbol })}
                  >
                    {stock.symbol}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    ${stock.price}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {stock.change.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
