import { useState } from "react";
import { usePriceAlertsContext } from "../contexts/PriceAlertsContext";
import { describeNotificationStatus } from "../hooks/usePriceAlerts";
import { fetchQuote } from "../api/finnhub";

export default function Alerts() {
  const { alerts, addAlert, removeAlert, remainingSlots, notificationStatus } =
    usePriceAlertsContext();

  const [symbol, setSymbol] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [condition, setCondition] = useState("above");
  const [message, setMessage] = useState(null);
  const [validating, setValidating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setValidating(true);

    try {
      // Fetch current price to validate
      const quote = await fetchQuote(symbol.toUpperCase());
      const currentPrice = quote.c;
      const targetPriceNum = parseFloat(targetPrice);

      // Validate based on condition
      if (condition === "above") {
        if (targetPriceNum <= currentPrice) {
          setMessage(
            `For "Above" alerts, the target price must be greater than the current price ($${currentPrice.toFixed(
              2
            )}).`
          );
          setValidating(false);
          return;
        }
      } else if (condition === "below") {
        if (targetPriceNum >= currentPrice) {
          setMessage(
            `For "Below" alerts, the target price must be less than the current price ($${currentPrice.toFixed(
              2
            )}).`
          );
          setValidating(false);
          return;
        }
      }

      // If validation passes, add the alert
      const result = addAlert({ symbol, targetPrice, condition });
      if (!result.ok) {
        setMessage(result.error || "Could not add alert.");
        setValidating(false);
        return;
      }
      setSymbol("");
      setTargetPrice("");
      setMessage("Alert added. You will be notified in the browser.");
    } catch {
      setMessage(
        "Failed to fetch current price. Please check the symbol and try again."
      );
    } finally {
      setValidating(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-white/10 bg-neutral-900 px-4 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-white/30";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-neutral-950 p-6">
        <div className="mb-1 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">New alert</h2>
          <span className="text-sm text-neutral-500">
            {remainingSlots} of 3 slots left
          </span>
        </div>
        <p className="mb-5 text-sm text-neutral-500">
          {describeNotificationStatus(notificationStatus)} Triggered alerts
          appear at the top and stay until dismissed.
        </p>

        <form
          className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
          onSubmit={handleSubmit}
        >
          <div>
            <label htmlFor="new-alert-symbol" className="mb-1.5 block text-xs text-neutral-500">
              Symbol
            </label>
            <input
              id="new-alert-symbol"
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className={`${inputClass} uppercase`}
              placeholder="AAPL"
              required
            />
          </div>
          <div>
            <label htmlFor="new-alert-target" className="mb-1.5 block text-xs text-neutral-500">
              Target price (USD)
            </label>
            <input
              id="new-alert-target"
              type="number"
              step="0.01"
              min="0"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className={inputClass}
              placeholder="300"
              required
            />
          </div>
          <div>
            <label htmlFor="new-alert-condition" className="mb-1.5 block text-xs text-neutral-500">
              Condition
            </label>
            <select
              id="new-alert-condition"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className={inputClass}
            >
              <option value="above">Above</option>
              <option value="below">Below</option>
            </select>
          </div>
          <div>
            <button
              type="submit"
              disabled={remainingSlots === 0 || validating}
              className="w-full rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-neutral-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {validating ? "Validating..." : "Add alert"}
            </button>
          </div>
        </form>
        {message && (
          <p
            className={`mt-3 text-sm ${
              message.includes("Alert added") ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {message}
          </p>
        )}
      </div>

      {alerts.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-neutral-950">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-neutral-500">
                <th scope="col" className="py-3 pl-5 pr-3 text-left font-medium">Symbol</th>
                <th scope="col" className="py-3 px-3 text-left font-medium">Condition</th>
                <th scope="col" className="py-3 px-3 text-right font-medium">Target</th>
                <th scope="col" className="py-3 pl-3 pr-5 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {alerts.map((alert) => (
                <tr key={alert.id} className="transition-colors hover:bg-white/3">
                  <th scope="row" className="py-4 pl-5 pr-3 text-left font-semibold text-white">
                    {alert.symbol}
                  </th>
                  <td className="py-4 px-3">
                    <span
                      className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold capitalize ${
                        alert.condition === "above"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {alert.condition === "above" ? "↑ Above" : "↓ Below"}
                    </span>
                  </td>
                  <td className="py-4 px-3 text-right font-medium text-white">
                    ${Number(alert.targetPrice).toFixed(2)}
                  </td>
                  <td className="py-4 pl-3 pr-5 text-right">
                    <button
                      type="button"
                      onClick={() => removeAlert(alert.id)}
                      className="rounded-full px-3 py-1.5 text-xs text-neutral-400 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-sm text-neutral-500">
          No alerts set yet.
        </div>
      )}
    </div>
  );
}
