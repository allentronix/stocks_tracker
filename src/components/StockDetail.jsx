import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { fetchQuote } from "../api/finnhub";
import LoadingSpinner from "./LoadingSpinner";
import { useWatchlist } from "../hooks/useWatchlist";
import { usePriceAlertsContext } from "../contexts/PriceAlertsContext";

// Loaded on demand so the chart library isn't part of the home page bundle.
const StockChart = lazy(() => import("./StockChart"));

export default function StockDetail({ stock, onBack }) {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isInWatchlist, toggleWatchlist, watchlist, MAX_WATCHLIST } =
    useWatchlist();
  const { alerts, addAlert, removeAlert, remainingSlots, notificationStatus } =
    usePriceAlertsContext();
  const [targetPrice, setTargetPrice] = useState("");
  const [condition, setCondition] = useState("above");
  const [alertMessage, setAlertMessage] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchQuote(stock.symbol);
        if (isMounted) setQuote(data);
      } catch {
        if (isMounted) setError(`Failed to load quote for ${stock.symbol}`);
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

    // Validate if we have quote data
    if (quote) {
      const currentPrice = quote.c;
      const targetPriceNum = parseFloat(targetPrice);

      // Validate based on condition
      if (condition === "above") {
        if (targetPriceNum <= currentPrice) {
          setAlertMessage(
            `For "Above" alerts, the target price must be greater than the current price ($${currentPrice.toFixed(2)}).`
          );
          return;
        }
      } else if (condition === "below") {
        if (targetPriceNum >= currentPrice) {
          setAlertMessage(
            `For "Below" alerts, the target price must be less than the current price ($${currentPrice.toFixed(2)}).`
          );
          return;
        }
      }
    }

    // If validation passes, add the alert
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


  const inWatchlist = isInWatchlist(stock.symbol);
  const up = quote && quote.d > 0;
  const down = quote && quote.d < 0;
  const fmt = (v) =>
    Number(v).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-sm text-neutral-300 hover:bg-white/5 hover:text-white transition-colors"
        >
          <span aria-hidden>←</span> Back
        </button>
        <button
          type="button"
          onClick={() => toggleWatchlist(stock.symbol)}
          title={
            !inWatchlist && watchlist.length >= MAX_WATCHLIST
              ? `Watchlist full (max ${MAX_WATCHLIST})`
              : undefined
          }
          aria-pressed={inWatchlist}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            inWatchlist
              ? "border border-white/10 text-neutral-200 hover:bg-white/5"
              : "bg-white text-black hover:bg-neutral-200"
          }`}
        >
          <svg
            className={`size-4 ${inWatchlist ? "text-yellow-400" : ""}`}
            viewBox="0 0 24 24"
            fill={inWatchlist ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          {inWatchlist ? "In Watchlist" : "Add to Watchlist"}
        </button>
      </div>

      {loading && <LoadingSpinner label="Loading quote..." />}
      {error && (
        <p className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}
      {!loading && !error && quote && (
        <>
          <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-4xl font-bold tracking-tight text-white tabular-nums">
                ${fmt(quote.c)}
              </span>
              {typeof quote.d === "number" && (
                <span
                  className={`rounded-md px-2 py-1 text-sm font-semibold tabular-nums ${
                    up
                      ? "bg-emerald-500/10 text-emerald-400"
                      : down
                        ? "bg-red-500/10 text-red-400"
                        : "bg-white/5 text-neutral-400"
                  }`}
                >
                  {quote.d > 0 ? "+" : ""}
                  {quote.d.toFixed(2)} ({quote.dp > 0 ? "+" : ""}
                  {Number(quote.dp).toFixed(2)}%)
                </span>
              )}
            </div>
            <dl className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-px overflow-hidden rounded-xl bg-white/5">
              {[
                ["Open", quote.o],
                ["High", quote.h],
                ["Low", quote.l],
                ["Prev Close", quote.pc],
              ].map(([label, value]) => (
                <div key={label} className="bg-neutral-950 p-4">
                  <dt className="text-xs uppercase tracking-wider text-neutral-500">
                    {label}
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-white tabular-nums">
                    ${fmt(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <Suspense fallback={<LoadingSpinner label="Loading chart" />}>
            <StockChart symbol={stock.symbol} />
          </Suspense>

          <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Price Alerts</h3>
              <span className="text-sm text-neutral-500">
                {remainingSlots} of 3 slots left
              </span>
            </div>
            <p className="mb-4 text-sm text-neutral-500">
              Browser notifications are {notificationStatus}. Triggered alerts
              appear at the top and stay until dismissed.
            </p>
            <form
              className="flex flex-col sm:flex-row gap-3"
              onSubmit={handleAddAlert}
            >
              <div className="flex-1">
                <label htmlFor="alert-target" className="mb-1.5 block text-xs text-neutral-500">
                  Target price (USD)
                </label>
                <input
                  id="alert-target"
                  type="number"
                  step="0.01"
                  min="0"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-2.5 text-sm text-white placeholder-neutral-600 outline-none focus:border-white/30"
                  placeholder={`e.g. ${Math.round(quote.c * 1.05)}`}
                  required
                />
              </div>
              <div>
                <label htmlFor="alert-condition" className="mb-1.5 block text-xs text-neutral-500">
                  Condition
                </label>
                <select
                  id="alert-condition"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-2.5 text-sm text-white outline-none focus:border-white/30"
                >
                  <option value="above">Above</option>
                  <option value="below">Below</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={remainingSlots === 0}
                  className="w-full sm:w-auto rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Add alert
                </button>
              </div>
            </form>
            {alertMessage && (
              <p
                className={`mt-3 text-sm ${
                  alertMessage.includes("Alert added")
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {alertMessage}
              </p>
            )}
            {alertsForStock.length > 0 ? (
              <ul className="mt-4 divide-y divide-white/5 rounded-xl border border-white/10">
                {alertsForStock.map((alert) => (
                  <li
                    key={alert.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <span className="text-sm text-neutral-200 tabular-nums">
                      {alert.symbol}{" "}
                      <span className="text-neutral-500">{alert.condition}</span>{" "}
                      ${Number(alert.targetPrice).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAlert(alert.id)}
                      className="rounded-full px-3 py-1 text-xs text-neutral-400 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-neutral-600">
                No active alerts for this stock.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
