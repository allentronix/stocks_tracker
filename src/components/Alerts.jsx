import { useState } from "react";
import { usePriceAlerts } from "../hooks/usePriceAlerts";

export default function Alerts() {
  const {
    alerts,
    addAlert,
    removeAlert,
    remainingSlots,
    notificationStatus,
  } = usePriceAlerts();

  const [symbol, setSymbol] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [condition, setCondition] = useState("above");
  const [message, setMessage] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage(null);
    const result = addAlert({ symbol, targetPrice, condition });
    if (!result.ok) {
      setMessage(result.error || "Could not add alert.");
      return;
    }
    setSymbol("");
    setTargetPrice("");
    setMessage("Alert added. You will be notified in the browser.");
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">Price Alerts</h2>
          <p className="text-gray-600 text-sm">
            Browser notifications are {notificationStatus}. Alerts auto-remove after
            firing.
          </p>
        </div>
        <span className="text-sm text-gray-600">
          Slots left: {remainingSlots} / 3
        </span>
      </div>

      <form
        className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end mb-4"
        onSubmit={handleSubmit}
      >
        <div>
          <label className="block text-xs text-gray-600 mb-1">Symbol</label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
            placeholder="AAPL"
            required
          />
        </div>
        <div>
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
            placeholder="300"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Condition</label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="above">Above</option>
            <option value="below">Below</option>
          </select>
        </div>
        <div>
          <button
            type="submit"
            disabled={remainingSlots === 0}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add alert
          </button>
        </div>
      </form>
      {message && <p className="text-sm text-gray-700 mb-3">{message}</p>}

      {alerts.length > 0 ? (
        <div className="overflow-hidden border border-gray-200 rounded-xl">
          <table className="w-full text-sm text-left text-gray-700">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Symbol</th>
                <th className="px-4 py-2 font-medium">Condition</th>
                <th className="px-4 py-2 font-medium">Target</th>
                <th className="px-4 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert, idx) => (
                <tr
                  key={alert.id}
                  className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="px-4 py-2">{alert.symbol}</td>
                  <td className="px-4 py-2 capitalize">{alert.condition}</td>
                  <td className="px-4 py-2">${Number(alert.targetPrice).toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => removeAlert(alert.id)}
                      className="text-red-600 hover:text-red-700"
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
        <p className="text-sm text-gray-600">No alerts set yet.</p>
      )}
    </div>
  );
}


