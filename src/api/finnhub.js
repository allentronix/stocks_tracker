import { apiGet } from "../config/api";

/**
 * Latest quote: { c: current, o: open, h: high, l: low, pc: previous close,
 * d: change, dp: % change, currency, available }.
 * Finnhub returns zeros when it has no price for a symbol; that is reported
 * as `available: false` with zero values rather than as an error.
 */
export async function fetchQuote(symbol) {
  const data = await apiGet(`quote?symbol=${encodeURIComponent(symbol)}`);
  const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  return {
    c: num(data?.c),
    o: num(data?.o),
    h: num(data?.h),
    l: num(data?.l),
    pc: num(data?.pc),
    d: num(data?.d),
    dp: num(data?.dp),
    currency: data?.currency || "USD",
    available: num(data?.c) > 0,
  };
}

export async function searchSymbol(query) {
  const data = await apiGet(`search?q=${encodeURIComponent(query)}`);
  return data?.result || []; // returns an array of matches
}
