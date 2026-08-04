import { useEffect, useRef, useState } from "react";
import { getWebSocketUrl } from "../config/api";

/**
 * Personalized pub/sub: gateway pushes only subscribed watchlist symbols.
 * @param {string[]} watchlist Uppercase symbols (max 3 expected).
 */
export function useWatchlistQuotesStream(watchlist) {
  const [status, setStatus] = useState("connecting");
  const [quotesBySymbol, setQuotesBySymbol] = useState({});
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const attemptRef = useRef(0);
  const watchlistRef = useRef(watchlist);
  watchlistRef.current = watchlist;

  useEffect(() => {
    let cancelled = false;

    const sendSubscribe = () => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      const symbols = [...watchlistRef.current].slice(0, 3);
      ws.send(JSON.stringify({ type: "subscribe", symbols }));
    };

    const connect = () => {
      if (cancelled) return;

      try {
        const ws = new WebSocket(getWebSocketUrl());
        wsRef.current = ws;

        ws.onopen = () => {
          if (cancelled) return;
          attemptRef.current = 0;
          setStatus("open");
          sendSubscribe();
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "prices" && Array.isArray(data.quotes)) {
              setQuotesBySymbol((prev) => {
                const next = { ...prev };
                for (const q of data.quotes) {
                  if (q?.symbol) next[q.symbol] = q;
                }
                return next;
              });
              if (data.lastUpdatedAt) setLastUpdatedAt(data.lastUpdatedAt);
            }
          } catch {
            // ignore
          }
        };

        ws.onerror = () => {
          if (!cancelled) setStatus("error");
        };

        ws.onclose = () => {
          if (cancelled) return;
          wsRef.current = null;
          setStatus("reconnecting");
          const delay = Math.min(30000, 1000 * 2 ** attemptRef.current);
          attemptRef.current += 1;
          reconnectTimerRef.current = window.setTimeout(connect, delay);
        };
      } catch {
        setStatus("error");
      }
    };

    setStatus("connecting");
    connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const symbols = [...watchlist].slice(0, 3);
    ws.send(JSON.stringify({ type: "subscribe", symbols }));
  }, [watchlist]);

  return { status, quotesBySymbol, lastUpdatedAt };
}
