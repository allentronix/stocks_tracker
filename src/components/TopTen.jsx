import LoadingSpinner from "./LoadingSpinner";
import { useWatchlist } from "../hooks/useWatchlist";
import { usePricesContext } from "../contexts/PricesContext";

export default function TopTen({ onStockSelect }) {
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const { stocks, loading } = usePricesContext();

  return (
    <div itemScope itemType="https://schema.org/ItemList">
      <meta itemProp="name" content="Top 10 Stocks by Market Cap" />
      <meta itemProp="description" content="Real-time stock prices for the top 10 companies by market capitalization" />

      <div className="flex justify-center mb-6">
        <h2 className="text-3xl font-bold text-white tracking-tight px-8 py-3 rounded-full bg-black/60 backdrop-blur-xl shadow-lg">
          Top 10 Stocks
        </h2>
      </div>
      <div className="stock-grid">
        {loading && stocks.length === 0 ? (
          <LoadingSpinner label="Fetching prices" />
        ) : stocks.length === 0 ? (
          <LoadingSpinner label="No stocks available" />
        ) : (
          <div className="relative overflow-x-auto bg-black shadow-2xl rounded-2xl border border-white/10">
            <table className="w-full text-sm text-left text-gray-100 tabular-nums">
              <thead className="bg-white/5 border-b border-white/10 text-gray-300">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider">
                    Symbol
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-right">
                    Price
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-right">
                    Change
                  </th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((stock, index) => {
                  const priceText =
                    typeof stock.currentPrice === "number"
                      ? `$${stock.currentPrice.toFixed(2)}`
                      : "—";
                  const changeText =
                    typeof stock.changePercent === "number"
                      ? stock.changePercent.toFixed(2)
                      : "—";
                  const isNegative =
                    typeof stock.changePercent === "number"
                      ? stock.changePercent < 0
                      : false;

                  // Calculate meter value (0-100 scale for percentage change)
                  const meterValue = typeof stock.changePercent === "number"
                    ? Math.min(Math.max((stock.changePercent + 10) * 5, 0), 100)
                    : 50;

                  const currentTimestamp = new Date().toISOString();

                  return (
                    <tr
                      key={stock.symbol}
                      className={`border-b border-white/5 ${
                        index % 2 === 0 ? "bg-white/10" : "bg-transparent"
                      }`}
                      itemScope
                      itemType="https://schema.org/Corporation"
                      itemProp="itemListElement"
                    >
                      <th scope="row" className="px-6 py-4">
                        <meta itemProp="position" content={index + 1} />
                        <meta itemProp="tickerSymbol" content={stock.symbol} />
                        <meta itemProp="name" content={stock.symbol} />

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="font-semibold text-base text-white whitespace-nowrap hover:text-blue-300 transition-colors cursor-pointer"
                            onClick={() =>
                              onStockSelect({ symbol: stock.symbol })
                            }
                          >
                            <span itemProp="alternateName">{stock.symbol}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleWatchlist(stock.symbol);
                            }}
                            className="focus:outline-none"
                            aria-label={
                              isInWatchlist(stock.symbol)
                                ? "Remove from watchlist"
                                : "Add to watchlist"
                            }
                          >
                            <svg
                              className={`w-5 h-5 transition-colors ${
                                isInWatchlist(stock.symbol)
                                  ? "text-yellow-400 fill-yellow-400"
                                  : "text-gray-400 hover:text-yellow-300"
                              }`}
                              viewBox="0 0 24 24"
                              fill={
                                isInWatchlist(stock.symbol)
                                  ? "currentColor"
                                  : "none"
                              }
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          </button>
                        </div>
                      </th>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-base font-medium">
                        {typeof stock.currentPrice === "number" ? (
                          <span itemScope itemType="https://schema.org/MonetaryAmount">
                            <data
                              itemProp="value"
                              value={stock.currentPrice}
                              className="tabular-nums"
                            >
                              ${stock.currentPrice.toFixed(2)}
                            </data>
                            <meta itemProp="currency" content="USD" />
                          </span>
                        ) : (
                          <span>—</span>
                        )}
                        <time
                          dateTime={currentTimestamp}
                          className="sr-only"
                          itemProp="dateModified"
                        >
                          {currentTimestamp}
                        </time>
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-right text-base font-semibold ${
                          isNegative ? "text-red-400" : "text-emerald-400"
                        }`}
                      >
                        {typeof stock.changePercent === "number" ? (
                          <div className="flex items-center justify-end gap-2">
                            <data
                              value={stock.changePercent}
                              className="tabular-nums"
                            >
                              {changeText}%
                            </data>
                            <meter
                              min="0"
                              max="100"
                              low="40"
                              high="60"
                              optimum="50"
                              value={meterValue}
                              className="sr-only"
                              aria-label={`Price change indicator: ${changeText}%`}
                            />
                          </div>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
