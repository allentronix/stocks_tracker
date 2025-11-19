import { useState, useEffect } from "react";
import { searchSymbol } from "../api/finnhub";
import useDebounce from "../hooks/useDebounce";

export default function SearchBar({ onStockSelect }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState([]);
  const debouncedQuery = useDebounce(query, 500);

  const getResults = async () => {
    if (!debouncedQuery) {
      setResult([]);
      return;
    }
    const results = await searchSymbol(debouncedQuery);
    setResult(results.slice(0, 5));
  };

  useEffect(() => {
    if (query?.trim().length === 0) {
      setResult([]);
    } else if (debouncedQuery) {
      getResults();
    }
  }, [debouncedQuery]);

  const handleSelect = (item) => {
    onStockSelect(item);
    setQuery("");
    setResult([]);
  };

  return (
    <div className="relative w-full max-w-sm sm:max-w-md mx-auto">
      <input
        type="search"
        name="search"
        placeholder="Search..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full shadow-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-500 border border-gray-300 px-5 py-3 rounded-xl transition-all duration-300 bg-white/90 text-gray-900 placeholder-gray-500 outline-none focus:w-full sm:focus:w-[440px]"
      />
      <svg
        className="size-6 absolute top-1/2 right-4 -translate-y-1/2 text-gray-500 pointer-events-none"
        stroke="currentColor"
        strokeWidth="1.5"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          strokeLinejoin="round"
          strokeLinecap="round"
        ></path>
      </svg>
      {result.length > 0 && (
        <ul className="absolute left-0 right-0 mt-3 bg-white/95 border border-gray-200 rounded-2xl shadow-2xl backdrop-blur p-2 max-h-64 overflow-y-auto z-20">
          {result.map((item) => (
            <li key={item.symbol}>
              <button
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-100 transition-colors flex flex-col"
              >
                <span className="font-semibold text-gray-900">
                  {item.symbol}
                </span>
                <span className="text-sm text-gray-500">
                  {item.description}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
