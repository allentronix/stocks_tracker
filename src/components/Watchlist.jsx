import { useWatchlist } from "../hooks/useWatchlist";
import { useWatchlistQuotesStream } from "../hooks/useWatchlistQuotesStream";
import { usePricesContext } from "../contexts/PricesContext";

const statusStyles = {
  open: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  connecting: "bg-amber-500/20 text-amber-200 border-amber-500/40",
  reconnecting: "bg-amber-500/20 text-amber-200 border-amber-500/40 animate-pulse",
  error: "bg-red-500/20 text-red-200 border-red-500/40",
};

function formatPrice(q) {
  if (!q || typeof q.currentPrice !== "number" || Number.isNaN(q.currentPrice)) {
    return "—";
  }
  return `$${q.currentPrice.toFixed(2)}`;
}

function formatChange(q) {
  if (
    !q ||
    typeof q.changePercent !== "number" ||
    Number.isNaN(q.changePercent)
  ) {
    return "—";
  }
  const sign = q.changePercent >= 0 ? "+" : "";
  return `${sign}${q.changePercent.toFixed(2)}%`;
}

export default function Watchlist({ onStockSelect }) {
  const { watchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const { isMarketOpen, loading: pricesLoading } = usePricesContext();
  const { status, quotesBySymbol, lastUpdatedAt } = useWatchlistQuotesStream(
    watchlist
  );

  const StarIcon = ({ filled, onClick }) => (
    <svg
      className={`w-5 h-5 cursor-pointer transition-colors ${
        filled ? "text-yellow-400 fill-yellow-400" : "text-gray-400"
      }`}
      onClick={onClick}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );

  if (watchlist.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Your watchlist is empty</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2
          className="text-3xl font-extrabold text-gray-900 tracking-wide px-8 py-3 rounded-full bg-gray-100 shadow-lg text-center sm:text-left"
          style={{ fontFamily: '"Work Sans", sans-serif' }}
        >
          Watchlist
        </h2>
        <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-end">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide border ${
              statusStyles[status] || statusStyles.connecting
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                status === "open"
                  ? "bg-emerald-400"
                  : status === "reconnecting" || status === "connecting"
                    ? "bg-amber-400"
                    : "bg-red-400"
              }`}
              aria-hidden
            />
            Live WS: {status}
          </span>
          {lastUpdatedAt && (
            <span className="text-xs text-gray-500 tabular-nums">
              Updated {new Date(lastUpdatedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
        {(status === "error" || status === "reconnecting" || status === "connecting") && (
          <p className="text-xs text-amber-200/90 bg-amber-950/40 border border-amber-500/30 rounded-lg px-3 py-2 max-w-xl">
            WebSocket targets port <strong className="font-mono">4000</strong>. Start the
            gateway in another terminal:{" "}
            <code className="text-amber-100 bg-black/30 px-1 rounded">npm run dev:server</code>
            , or run both with{" "}
            <code className="text-amber-100 bg-black/30 px-1 rounded">npm run dev:all</code>
            .
          </p>
        )}
      </div>
      {!pricesLoading && !isMarketOpen && (
        <p className="mb-3 text-xs text-slate-400 bg-white/5 border border-white/10 rounded-lg px-3 py-2 max-w-2xl">
          <span className="font-medium text-slate-300">Market closed.</span> The
          gateway does not fetch live quotes while the session is closed. Prices
          here are only if they were cached earlier (e.g. last session); otherwise
          you may see — until the market opens.
        </p>
      )}
      <div className="relative overflow-x-auto bg-black shadow-2xl rounded-2xl border border-white/10">
        <table className="w-full text-sm text-left text-gray-100 tabular-nums">
          <thead className="bg-white/5 border-b border-white/10 text-gray-300">
            <tr>
              <th scope="col" className="px-6 py-3 font-medium">
                Symbol
              </th>
              <th scope="col" className="px-6 py-3 font-medium text-right">
                Price
              </th>
              <th scope="col" className="px-6 py-3 font-medium text-right">
                Change
              </th>
              <th scope="col" className="px-6 py-3 font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {watchlist.map((symbol, index) => {
              const q = quotesBySymbol[symbol];
              const neg =
                typeof q?.changePercent === "number" && q.changePercent < 0;
              return (
                <tr
                  key={symbol}
                  className={`border-b border-white/5 ${
                    index % 2 === 0 ? "bg-white/10" : "bg-transparent"
                  }`}
                >
                  <th scope="row" className="px-6 py-4">
                    <button
                      type="button"
                      className="font-semibold text-white whitespace-nowrap hover:text-blue-300 transition-colors cursor-pointer"
                      onClick={() => onStockSelect({ symbol })}
                    >
                      {symbol}
                    </button>
                  </th>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    {formatPrice(q)}
                  </td>
                  <td
                    className={`px-6 py-4 text-right whitespace-nowrap ${
                      neg ? "text-red-400" : "text-emerald-400"
                    }`}
                  >
                    {formatChange(q)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onStockSelect({ symbol })}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                      >
                        View
                      </button>
                      <StarIcon
                        filled={isInWatchlist(symbol)}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromWatchlist(symbol);
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-gray-500 text-center sm:text-left">
        {!pricesLoading && !isMarketOpen
          ? "WebSocket stays connected; live quote fetches resume when the market opens."
          : "Prices stream over your gateway WebSocket (subscribe to up to 3 symbols). Reconnects automatically if the connection drops."}
      </p>
    </div>
  );
}
