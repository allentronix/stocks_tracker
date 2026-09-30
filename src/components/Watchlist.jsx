import { MAX_WATCHLIST, useWatchlist } from "../hooks/useWatchlist";
import { useWatchlistQuotesStream } from "../hooks/useWatchlistQuotesStream";
import { usePricesContext } from "../contexts/PricesContext";

const isNum = (v) => typeof v === "number" && !Number.isNaN(v);

function formatPrice(q) {
  if (!q || !isNum(q.currentPrice)) return "—";
  return `$${q.currentPrice.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const formatSigned = (v, suffix = "") =>
  isNum(v) ? `${v > 0 ? "+" : ""}${v.toFixed(2)}${suffix}` : "—";

export default function Watchlist({ onStockSelect }) {
  const { watchlist, removeFromWatchlist } = useWatchlist();
  const { isMarketOpen, loading: pricesLoading } = usePricesContext();
  const { status, quotesBySymbol, lastUpdatedAt } = useWatchlistQuotesStream(
    watchlist
  );

  if (watchlist.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center">
        <p className="text-neutral-300">Your watchlist is empty</p>
        <p className="mt-1 text-sm text-neutral-500">
          Search for a stock or tap the star next to one in Popular Stocks.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
        <span className="text-sm text-neutral-500">
          {watchlist.length} of {MAX_WATCHLIST} slots used
        </span>
        <span className="inline-flex items-center gap-2 text-xs text-neutral-500 tabular-nums">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              status === "open"
                ? "bg-emerald-400"
                : status === "error"
                  ? "bg-red-400"
                  : "bg-amber-400 animate-pulse"
            }`}
            aria-hidden
          />
          {status === "error"
            ? "Couldn't reach the price service — retrying"
            : lastUpdatedAt
              ? `Updated ${new Date(lastUpdatedAt).toLocaleTimeString()}`
              : "Loading prices…"}
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-neutral-950">
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-neutral-500">
              <th scope="col" className="py-3 pl-4 sm:pl-5 pr-3 text-left font-medium">Symbol</th>
              <th scope="col" className="py-3 px-3 text-right font-medium">Price</th>
              <th scope="col" className="hidden sm:table-cell py-3 px-3 text-right font-medium">Change</th>
              <th scope="col" className="py-3 px-3 text-right font-medium">% Change</th>
              <th scope="col" className="py-3 pl-3 pr-5 text-right font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {watchlist.map((symbol) => {
              const q = quotesBySymbol[symbol];
              const pct = q?.changePercent;
              const up = isNum(pct) && pct > 0;
              const down = isNum(pct) && pct < 0;
              const tone = up ? "text-emerald-400" : down ? "text-red-400" : "text-neutral-400";
              const pill = up
                ? "bg-emerald-500/10 text-emerald-400"
                : down
                  ? "bg-red-500/10 text-red-400"
                  : "bg-white/5 text-neutral-400";
              return (
                <tr
                  key={symbol}
                  onClick={() => onStockSelect({ symbol })}
                  className="cursor-pointer transition-colors hover:bg-white/3"
                >
                  <th scope="row" className="py-4 pl-4 sm:pl-5 pr-3 text-left font-normal">
                    <div className="flex items-center gap-3">
                      <span className="hidden sm:flex size-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-[11px] font-semibold text-neutral-300 ring-1 ring-white/10">
                        {symbol.slice(0, 2)}
                      </span>
                      <span className="font-semibold text-white">{symbol}</span>
                    </div>
                  </th>
                  <td className="py-4 px-3 text-right font-medium text-white whitespace-nowrap">
                    {formatPrice(q)}
                  </td>
                  <td className={`hidden sm:table-cell py-4 px-3 text-right whitespace-nowrap ${tone}`}>
                    {formatSigned(q?.change)}
                  </td>
                  <td className="py-4 px-3 text-right whitespace-nowrap">
                    <span className={`inline-flex min-w-19 justify-center rounded-md px-2 py-1 text-xs font-semibold ${pill}`}>
                      {formatSigned(pct, "%")}
                    </span>
                  </td>
                  <td className="py-4 pl-3 pr-5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromWatchlist(symbol);
                      }}
                      className="rounded-full px-3 py-1.5 text-xs text-neutral-400 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 px-1 text-xs text-neutral-500">
        {!pricesLoading && !isMarketOpen
          ? "Market closed — prices are from the last trading session."
          : "Prices refresh automatically every minute."}
      </p>
    </div>
  );
}
