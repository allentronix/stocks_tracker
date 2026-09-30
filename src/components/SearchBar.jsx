import { useState, useEffect } from "react";
import { searchSymbol } from "../api/finnhub";
import useDebounce from "../hooks/useDebounce";

export default function SearchBar({ onStockSelect, align = "center" }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState([]);
  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (!trimmed) {
      setResult([]);
      return;
    }
    // Ignore responses that arrive after the query has changed.
    let cancelled = false;
    searchSymbol(trimmed)
      .then((results) => {
        if (!cancelled) setResult(results.slice(0, 5));
      })
      .catch(() => {
        if (!cancelled) setResult([]);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const handleSelect = (item) => {
    onStockSelect(item);
    setQuery("");
    setResult([]);
  };

  const handleClear = () => {
    setQuery("");
    setResult([]);
  };

  return (
    <div
      className={`relative w-full max-w-md ${align === "center" ? "mx-auto" : ""}`}
    >
      <svg
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 size-4 text-neutral-500"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <path
          d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <input
        type="search"
        name="search"
        aria-label="Search stocks"
        placeholder="Search a company or ticker…"
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-full border border-white/10 bg-neutral-900 py-3 pl-11 pr-11 text-sm text-white placeholder-neutral-500 outline-none transition-colors focus:border-white/30 focus:bg-neutral-800 [&::-webkit-search-cancel-button]:hidden"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-neutral-500 hover:text-white transition-colors"
          aria-label="Clear search"
        >
          <svg
            className="size-4"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path d="M18 6L6 18M6 6l12 12" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        </button>
      )}
      {result.length > 0 && (
        <ul className="absolute left-0 right-0 z-30 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-neutral-900/95 p-1.5 text-left shadow-2xl backdrop-blur-xl">
          {result.map((item) => (
            <li key={item.symbol}>
              <button
                type="button"
                onClick={() => handleSelect(item)}
                className="flex w-full items-center justify-between gap-4 rounded-xl px-3.5 py-2.5 text-left hover:bg-white/5 transition-colors"
              >
                <span className="truncate text-sm text-neutral-300">
                  {item.description}
                </span>
                <span className="shrink-0 font-mono text-xs font-semibold text-white">
                  {item.symbol}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
