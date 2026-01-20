import LoadingSpinner from "./LoadingSpinner";
import { useWatchlist } from "../hooks/useWatchlist";
import { usePricesContext } from "../contexts/PricesContext";
import MarketStatus from "./MarketStatus";

export default function TopTen({ onStockSelect }) {
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const { stocks, loading } = usePricesContext();

  return (
    <div>
      <div className="flex flex-col items-center gap-4 mb-6">
        <h2
          className="text-3xl font-extrabold text-white tracking-wide px-8 py-3 rounded-full bg-black/60 backdrop-blur-xl shadow-lg"
          style={{ fontFamily: '"Work Sans", sans-serif' }}
        >
          Top 10 Stocks
        </h2>
        <MarketStatus />
      </div>
      <div className="stock-grid">
        {loading && stocks.length === 0 ? (
          <LoadingSpinner label="Fetching prices" />
        ) : stocks.length === 0 ? (
          <LoadingSpinner label="No stocks available" />
        ) : (
          <div className="relative overflow-x-auto bg-black shadow-2xl rounded-2xl border border-white/10">
            <table className="w-full text-sm text-left text-gray-100">
              <thead className="bg-white/5 border-b border-white/10 text-gray-300">
                <tr>
                  <th scope="col" className="px-6 py-3 font-medium">
                    Symbol
                  </th>
                  <th scope="col" className="px-6 py-3 font-medium">
                    Price
                  </th>
                  <th scope="col" className="px-6 py-3 font-medium">
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
                  return (
                    <tr
                      key={stock.symbol}
                      className={`border-b border-white/5 ${
                        index % 2 === 0 ? "bg-white/10" : "bg-transparent"
                      }`}
                    >
                      <th scope="row" className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="font-semibold text-white whitespace-nowrap hover:text-blue-300 transition-colors cursor-pointer"
                            onClick={() =>
                              onStockSelect({ symbol: stock.symbol })
                            }
                          >
                            {stock.symbol}
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        {priceText}
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap font-semibold ${
                          isNegative ? "text-red-400" : "text-emerald-400"
                        }`}
                      >
                        {changeText}%
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
