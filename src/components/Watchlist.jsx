import { useWatchlist } from "../hooks/useWatchlist";

export default function Watchlist({ onStockSelect }) {
  const { watchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();

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
        <p className="text-gray-400 text-sm mt-2">
          Star stocks from the Top 10 or detail pages to add them here
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-center mb-6">
        <h2
          className="text-3xl font-extrabold text-gray-900 tracking-wide px-8 py-3 rounded-full bg-gray-100 shadow-lg"
          style={{ fontFamily: '"Work Sans", sans-serif' }}
        >
          Watchlist
        </h2>
      </div>
      <div className="relative overflow-x-auto bg-black shadow-2xl rounded-2xl border border-white/10">
        <table className="w-full text-sm text-left text-gray-100">
          <thead className="bg-white/5 border-b border-white/10 text-gray-300">
            <tr>
              <th scope="col" className="px-6 py-3 font-medium">
                Symbol
              </th>
              <th scope="col" className="px-6 py-3 font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {watchlist.map((symbol, index) => (
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

