import { useEffect, useMemo, useState } from "react";
import { fetchQuote } from "../api/finnhub";
import TradingViewWidget from "./TradingViewWidget";
import LoadingSpinner from "./LoadingSpinner";
import { useWatchlist } from "../hooks/useWatchlist";
import { usePriceAlertsContext } from "../contexts/PriceAlertsContext";

export default function StockDetail({ stock, onBack }) {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const { alerts, addAlert, removeAlert, remainingSlots, notificationStatus } =
    usePriceAlertsContext();
  const [targetPrice, setTargetPrice] = useState("");
  const [condition, setCondition] = useState("above");
  const [alertMessage, setAlertMessage] = useState(null);

  useEffect(() => {
    // const socket = new WebSocket(
    //   `wss://ws.finnhub.io?token=${import.meta.env.VITE_FINNHUB_API_KEY}`
    // );

    // // Connection opened -> Subscribe
    // socket.addEventListener("open", function (event) {
    //   socket.send(JSON.stringify({ type: "subscribe", symbol: "AAPL" }));
    //   // socket.send(
    //   //   JSON.stringify({ type: "subscribe", symbol: "BINANCE:BTCUSDT" })
    //   // );
    //   // socket.send(
    //   //   JSON.stringify({ type: "subscribe", symbol: "IC MARKETS:1" })
    //   // );
    // });

    // // Listen for messages
    // socket.addEventListener("message", function (event) {
    //   console.log("Message from server ", event.data);
    // });

    // Unsubscribe
    // var unsubscribe = function (symbol) {
    //   socket.send(JSON.stringify({ type: "unsubscribe", symbol: symbol }));
    // };

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

  const alertsForStock = useMemo(
    () => alerts.filter((alert) => alert.symbol === stock.symbol.toUpperCase()),
    [alerts, stock.symbol]
  );

  const handleAddAlert = (e) => {
    e.preventDefault();
    setAlertMessage(null);
    const result = addAlert({
      symbol: stock.symbol,
      targetPrice,
      condition,
    });
    if (!result.ok) {
      setAlertMessage(result.error || "Could not add alert.");
      return;
    }
    setTargetPrice("");
    setAlertMessage("Alert added. You will be notified in the browser.");
  };

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
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Price Alerts</h3>
              <span className="text-sm text-gray-600">
                Slots left: {remainingSlots} / 3
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Browser notifications are {notificationStatus}. Triggered alerts
              appear at the top right and stay until dismissed.
            </p>
            <form
              className="flex flex-col sm:flex-row gap-3"
              onSubmit={handleAddAlert}
            >
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">
                  Target price (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 300"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="rounded border px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="above">Above</option>
                  <option value="below">Below</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={remainingSlots === 0}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add alert
                </button>
              </div>
            </form>
            {alertMessage && (
              <p className="text-sm mt-2 text-gray-700">{alertMessage}</p>
            )}
            {alertsForStock.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {alertsForStock.map((alert) => (
                  <li
                    key={alert.id}
                    className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-3 py-2"
                  >
                    <div className="text-sm text-gray-800">
                      {alert.symbol} {alert.condition} ${alert.targetPrice}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAlert(alert.id)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 mt-3">
                No active alerts for this stock.
              </p>
            )}
          </div>
          <div className="mt-6" style={{ height: "600px" }}>
            <TradingViewWidget symbol={stock.symbol} />
          </div>
        </>
      )}
    </div>
  );
}
