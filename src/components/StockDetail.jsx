import { useEffect, useState } from "react";
import { fetchQuote } from "../api/finnhub";
import TradingViewWidget from "./TradingViewWidget";
import LoadingSpinner from "./LoadingSpinner";
import { useWatchlist } from "../hooks/useWatchlist";

export default function StockDetail({ stock, onBack }) {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isInWatchlist, toggleWatchlist } = useWatchlist();

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchQuote(stock.symbol);
        if (isMounted) setQuote(data);
      } catch (e) {
        if (isMounted) setError("Failed to load quote");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [stock.symbol]);

  return (
    <div className="p-4 bg-white rounded-md shadow">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 px-3 py-1 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
      >
        ← Back
      </button>

      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-2xl font-bold">{stock.symbol}</h2>
        <button
          type="button"
          onClick={() => toggleWatchlist(stock.symbol)}
          className="focus:outline-none"
          aria-label={
            isInWatchlist(stock.symbol)
              ? "Remove from watchlist"
              : "Add to watchlist"
          }
        >
          <svg
            className={`w-6 h-6 transition-colors ${
              isInWatchlist(stock.symbol)
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-400 hover:text-yellow-300"
            }`}
            viewBox="0 0 24 24"
            fill={isInWatchlist(stock.symbol) ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      </div>
      {stock.description && (
        <p className="text-gray-600 mb-4">{stock.description}</p>
      )}

      {loading && <LoadingSpinner label="Loading quote..." />}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && quote && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-xs text-gray-500">Current</div>
              <div className="text-lg font-semibold">${quote.c}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-xs text-gray-500">Open</div>
              <div className="text-lg font-semibold">${quote.o}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-xs text-gray-500">High</div>
              <div className="text-lg font-semibold">${quote.h}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <div className="text-xs text-gray-500">Low</div>
              <div className="text-lg font-semibold">${quote.l}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded col-span-2">
              <div className="text-xs text-gray-500">Prev Close</div>
              <div className="text-lg font-semibold">${quote.pc}</div>
            </div>
          </div>
          <div className="mt-6" style={{ height: "600px" }}>
            <TradingViewWidget symbol={stock.symbol} />
          </div>
        </>
      )}
    </div>
  );
}
