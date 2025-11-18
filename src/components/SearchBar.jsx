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
    // searchSymbol(debouncedQuery).then(setResult);
    const results = await searchSymbol(debouncedQuery);
    setResult(results.slice(0, 5)); // limit to top 5 results
  };

  useEffect(() => {
    if (query?.trim().length === 0) {
      setResult([]);
    } else if (debouncedQuery) {
      getResults();
    }
  }, [debouncedQuery]);
  return (
    <div>
      <input
        type="text"
        placeholder="Search for a stock"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{
          width: "300px",
          padding: "8px",
          borderRadius: "4px",
          border: "1px solid #ccc",
        }}
      />
      <ul>
        {result.map((item) => (
          <li
            key={item.symbol}
            onClick={() => {
              onStockSelect(item);
              setQuery("");
              setResult([]);
            }}
            className="cursor-pointer hover:bg-gray-700 hover:text-white p-2 rounded-md"
          >
            <strong>{item.symbol}</strong> - {item.description}
          </li>
        ))}
      </ul>
    </div>
  );
}
