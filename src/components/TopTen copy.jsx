import { fetchQuote } from "../api/finnhub";
import { useState, useEffect } from "react";
import LoadingSpinner from "./LoadingSpinner";
import { useWatchlist } from "../hooks/useWatchlist";
import { usePricesContext } from "../contexts/PricesContext";

export default function TopTen({ onStockSelect }) {
  const [stocks, setStocks] = useState([]);
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
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

  const {
    stocks: pricesStocks,
    subscribeToSymbol,
    unsubscribeFromSymbol,
    unsubscribeAll,
  } = usePricesContext();
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
      topTenSymbols.forEach(async (symbol) => {
        await subscribeToSymbol(symbol);
      });
      for (let symbol of topTenSymbols) {
        // const data = await fetchQuote(symbol);
        // const current = Number(data?.c);
        // const prevClose = Number(data?.pc);
        // const price = Number.isFinite(current) ? current : null;
        // const change =
        //   Number.isFinite(current) && Number.isFinite(prevClose)
        //     ? current - prevClose
        //     : null;
        // results.push({ symbol, price, change });
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

    // // Set up interval to refresh every minute
    // const interval = setInterval(() => {
    //   if (isMounted) loadTopStocks();
    // }, refreshInterval);

    return () => {
      isMounted = false;
      // clearInterval(interval);
    };
  }, []);

  return (
    <div>
      <div className="flex justify-center mb-6">
        <h2
          className="text-3xl font-extrabold text-white tracking-wide px-8 py-3 rounded-full bg-black/60 backdrop-blur-xl shadow-lg"
          style={{ fontFamily: '"Work Sans", sans-serif' }}
        >
          Top 10 Stocks
        </h2>
      </div>
      <div className="stock-grid">
        {pricesStocks.length === 0 ? (
          <LoadingSpinner label="Fetching prices" />
        ) : (
          <div className="relative overflow-x-auto bg-black shadow-2xl rounded-2xl border border-white/10">
            <table className="w-full text-sm text-left text-gray-100">
              <thead className="bg-white/5 border-b border-white/10 text-gray-300">
                <tr>
                  <th scope="col" className="px-6 py-3 font-medium">
                    Symbol
                  </th>
                  <th scope="col" className="px-6 py-3 font-medium">
                    Price
                  </th>
                  <th scope="col" className="px-6 py-3 font-medium">
                    Change
                  </th>
                </tr>
              </thead>
              <tbody>
                {pricesStocks.map((stock, index) => {
                  const priceText =
                    typeof stock.currentPrice === "number"
                      ? `$${stock.currentPrice.toFixed(2)}`
                      : "—";
                  const changeText =
                    typeof stock.changePercent === "number"
                      ? stock.changePercent.toFixed(2)
                      : "—";
                  const isNegative =
                    typeof stock.changePercent === "number" ? stock.changePercent < 0 : false;
                  return (
                    <tr
                      key={stock.symbol}
                      className={`border-b border-white/5 ${
                        index % 2 === 0 ? "bg-white/10" : "bg-transparent"
                      }`}
                    >
                      <th scope="row" className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="font-semibold text-white whitespace-nowrap hover:text-blue-300 transition-colors cursor-pointer"
                            onClick={() =>
                              onStockSelect({ symbol: stock.symbol })
                            }
                          >
                            {stock.symbol}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleWatchlist(stock.symbol);
                            }}
                            className="focus:outline-none"
                            aria-label={
                              isInWatchlist(stock.symbol)
                                ? "Remove from watchlist"
                                : "Add to watchlist"
                            }
                          >
                            <svg
                              className={`w-5 h-5 transition-colors ${
                                isInWatchlist(stock.symbol)
                                  ? "text-yellow-400 fill-yellow-400"
                                  : "text-gray-400 hover:text-yellow-300"
                              }`}
                              viewBox="0 0 24 24"
                              fill={
                                isInWatchlist(stock.symbol)
                                  ? "currentColor"
                                  : "none"
                              }
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          </button>
                        </div>
                      </th>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {priceText}
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap font-semibold ${
                          isNegative ? "text-red-400" : "text-emerald-400"
                        }`}
                      >
                        {changeText}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
