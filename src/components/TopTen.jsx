import LoadingSpinner from "./LoadingSpinner";
import { useWatchlist } from "../hooks/useWatchlist";
import { usePricesContext } from "../contexts/PricesContext";
import { formatMoney, formatSigned } from "../utils/format";

const COMPANY_NAMES = {
  AAPL: "Apple Inc.",
  MSFT: "Microsoft Corp.",
  GOOGL: "Alphabet Inc.",
  AMZN: "Amazon.com Inc.",
  TSLA: "Tesla Inc.",
  NVDA: "NVIDIA Corp.",
  META: "Meta Platforms Inc.",
  NFLX: "Netflix Inc.",
  INTC: "Intel Corp.",
  CSCO: "Cisco Systems Inc.",
};

const isNum = (v) => typeof v === "number" && !Number.isNaN(v);

// Missing prices and changes are shown as zero.

function StarButton({ active, disabled, max, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={disabled ? `Watchlist full (max ${max})` : undefined}
      aria-label={active ? "Remove from watchlist" : "Add to watchlist"}
      aria-pressed={active}
      className="rounded-full p-1.5 text-neutral-500 hover:bg-white/5 hover:text-yellow-300 transition-colors"
    >
      <svg
        className={`size-4 ${active ? "text-yellow-400" : ""}`}
        viewBox="0 0 24 24"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    </button>
  );
}

export default function TopTen({ onStockSelect }) {
  const { isInWatchlist, toggleWatchlist, watchlist, MAX_WATCHLIST } =
    useWatchlist();
  const { stocks, loading, isMarketOpen } = usePricesContext();

  return (
    <div itemScope itemType="https://schema.org/ItemList">
      <meta itemProp="name" content="Popular Stocks" />
      <meta itemProp="description" content="Real-time stock prices for popular US companies" />

      <div className="mb-4 flex items-end justify-between gap-4 px-1">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white">
            Popular Stocks
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Most-watched US companies
          </p>
        </div>
        <span className="hidden sm:inline text-xs text-neutral-500">
          {isMarketOpen ? "Updates every minute" : "Last close"} · USD
        </span>
      </div>

      {loading && stocks.length === 0 ? (
        <LoadingSpinner label="Fetching prices" />
      ) : stocks.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-neutral-950 py-12 text-center text-sm text-neutral-500">
          No stocks available right now.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-neutral-950/90 backdrop-blur-xl">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-neutral-500">
                <th scope="col" className="hidden sm:table-cell w-12 py-3 pl-5 pr-2 text-left font-medium">#</th>
                <th scope="col" className="py-3 pl-4 sm:pl-3 pr-3 text-left font-medium">Company</th>
                <th scope="col" className="py-3 px-3 text-right font-medium">Price</th>
                <th scope="col" className="hidden sm:table-cell py-3 px-3 text-right font-medium">Change</th>
                <th scope="col" className="py-3 px-3 text-right font-medium">% Change</th>
                <th scope="col" className="w-10 py-3 pl-1 pr-3 sm:pr-4"><span className="sr-only">Watchlist</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stocks.map((stock, index) => {
                const pct = stock.changePercent;
                const up = isNum(pct) && pct > 0;
                const down = isNum(pct) && pct < 0;
                const tone = up ? "text-emerald-400" : down ? "text-red-400" : "text-neutral-400";
                const pill = up
                  ? "bg-emerald-500/10 text-emerald-400"
                  : down
                    ? "bg-red-500/10 text-red-400"
                    : "bg-white/5 text-neutral-400";

                // Meter value (0-100 scale for percentage change)
                const meterValue = isNum(pct)
                  ? Math.min(Math.max((pct + 10) * 5, 0), 100)
                  : 50;
                const currentTimestamp = new Date().toISOString();
                const inWatchlist = isInWatchlist(stock.symbol);

                return (
                  <tr
                    key={stock.symbol}
                    onClick={() => onStockSelect({ symbol: stock.symbol })}
                    className="group cursor-pointer transition-colors hover:bg-white/3"
                    itemScope
                    itemType="https://schema.org/Corporation"
                    itemProp="itemListElement"
                  >
                    <td className="hidden sm:table-cell py-4 pl-5 pr-2 text-neutral-500">
                      <meta itemProp="position" content={index + 1} />
                      {index + 1}
                    </td>
                    <th scope="row" className="py-4 pl-4 sm:pl-3 pr-3 text-left font-normal">
                      <meta itemProp="tickerSymbol" content={stock.symbol} />
                      <div className="flex items-center gap-3">
                        <span className="hidden sm:flex size-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-[11px] font-semibold text-neutral-300 ring-1 ring-white/10">
                          {stock.symbol.slice(0, 2)}
                        </span>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStockSelect({ symbol: stock.symbol });
                            }}
                            className="block font-semibold text-white group-hover:text-white/90"
                          >
                            <span itemProp="alternateName">{stock.symbol}</span>
                          </button>
                          <span itemProp="name" className="block truncate text-xs text-neutral-500">
                            {COMPANY_NAMES[stock.symbol] || stock.symbol}
                          </span>
                        </div>
                      </div>
                    </th>
                    <td className="py-4 px-3 text-right font-medium text-white whitespace-nowrap">
                      <span itemScope itemType="https://schema.org/MonetaryAmount">
                        <data itemProp="value" value={isNum(stock.currentPrice) ? stock.currentPrice : 0}>
                          {formatMoney(stock.currentPrice, stock.currency)}
                        </data>
                        <meta itemProp="currency" content={stock.currency || "USD"} />
                      </span>
                      <time dateTime={currentTimestamp} className="sr-only" itemProp="dateModified">
                        {currentTimestamp}
                      </time>
                    </td>
                    <td className={`hidden sm:table-cell py-4 px-3 text-right whitespace-nowrap ${tone}`}>
                      {formatSigned(stock.change)}
                    </td>
                    <td className="py-4 px-3 text-right whitespace-nowrap">
                      <span className={`inline-flex min-w-19 justify-center rounded-md px-2 py-1 text-xs font-semibold ${pill}`}>
                        <data value={isNum(pct) ? pct : ""}>{formatSigned(pct, "%")}</data>
                      </span>
                      <meter
                        min="0"
                        max="100"
                        low="40"
                        high="60"
                        optimum="50"
                        value={meterValue}
                        className="sr-only"
                        aria-label={`Price change indicator: ${formatSigned(pct, "%")}`}
                      />
                    </td>
                    <td className="py-4 pl-1 pr-3 sm:pr-4 text-right">
                      <StarButton
                        active={inWatchlist}
                        max={MAX_WATCHLIST}
                        disabled={!inWatchlist && watchlist.length >= MAX_WATCHLIST}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWatchlist(stock.symbol);
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
