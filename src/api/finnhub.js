import { apiGet } from "../config/api";

export async function fetchQuote(symbol) {
  const data = await apiGet(`quote?symbol=${encodeURIComponent(symbol)}`);
  // Finnhub returns all zeros for unknown symbols.
  if (!data || !data.c) {
    throw new Error(`No quote data for ${symbol}`);
  }
  return data; // { c: current price, h: high, l: low, o: open, pc: previous close }
}

export async function searchSymbol(query) {
  const data = await apiGet(`search?q=${encodeURIComponent(query)}`);
  return data?.result || []; // returns an array of matches
}
