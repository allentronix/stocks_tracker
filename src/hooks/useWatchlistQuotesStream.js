import { useEffect, useState } from "react";
import { apiGet } from "../config/api";
import { MAX_WATCHLIST } from "./useWatchlist";

const POLL_INTERVAL_MS = 60000;

/**
 * Polls the API gateway for quotes of the watchlist symbols.
 * @param {string[]} watchlist Uppercase symbols (max MAX_WATCHLIST).
 */
export function useWatchlistQuotesStream(watchlist) {
  const [status, setStatus] = useState("connecting");
  const [quotesBySymbol, setQuotesBySymbol] = useState({});
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  // Stable dependency so a new array with the same symbols doesn't refetch.
  const symbolsKey = watchlist.slice(0, MAX_WATCHLIST).join(",");

  useEffect(() => {
    if (!symbolsKey) return;
    let cancelled = false;

    async function refresh() {
      try {
        const data = await apiGet(`quotes?symbols=${encodeURIComponent(symbolsKey)}`);
        if (cancelled) return;
        if (Array.isArray(data?.quotes)) {
          setQuotesBySymbol((prev) => {
            const next = { ...prev };
            for (const q of data.quotes) {
              if (q?.symbol) next[q.symbol] = q;
            }
            return next;
          });
        }
        if (data?.lastUpdatedAt) setLastUpdatedAt(data.lastUpdatedAt);
        setStatus("open");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    refresh();
    const intervalId = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [symbolsKey]);

  return { status, quotesBySymbol, lastUpdatedAt };
}
