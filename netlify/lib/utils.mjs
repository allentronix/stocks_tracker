/**
 * Pure helpers shared by the API function. Kept free of network and
 * environment access so they can be unit-tested (see tests/).
 */

const SYMBOL_PATTERN = /^[A-Z0-9.:\-^]{1,20}$/;

/** Parses "aapl, MSFT,bad!" into unique, valid, uppercase tickers (at most `max`). */
export function parseSymbols(raw, max) {
  return [
    ...new Set(
      String(raw || "")
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter((s) => SYMBOL_PATTERN.test(s))
    ),
  ].slice(0, max);
}

/** Converts a raw Finnhub quote into the shape the app uses. */
export function normalizeQuote(symbol, data) {
  const c = data?.c;
  const pc = data?.pc;
  // Finnhub returns zeros for unknown symbols.
  const hasC = typeof c === "number" && !Number.isNaN(c) && c !== 0;
  const hasPc = typeof pc === "number" && !Number.isNaN(pc) && pc !== 0;
  return {
    symbol,
    currentPrice: hasC ? c : null,
    previousClose: hasPc ? pc : null,
    change: hasC && hasPc ? c - pc : null,
    changePercent: hasC && hasPc ? ((c - pc) / pc) * 100 : null,
  };
}

/** Converts Twelve Data time_series values into numeric OHLCV bars. */
export function parseBars(values) {
  return (values || [])
    .map((v) => ({
      time: String(v.datetime || "").slice(0, 10),
      open: Number(v.open),
      high: Number(v.high),
      low: Number(v.low),
      close: Number(v.close),
      volume: Number(v.volume) || 0,
    }))
    .filter(
      (b) =>
        /^\d{4}-\d{2}-\d{2}$/.test(b.time) &&
        [b.open, b.high, b.low, b.close].every(Number.isFinite)
    );
}

/** Converts a Finnhub company profile into the fields the app shows. */
export function normalizeProfile(symbol, data) {
  if (!data || !data.name) return null;
  return {
    symbol,
    name: data.name,
    logo: isWebUrl(data.logo) ? data.logo : null,
    industry: data.finnhubIndustry || null,
    exchange: shortExchangeName(data.exchange),
    country: data.country || null,
    currency: data.currency || null,
    // Finnhub reports market cap in millions.
    marketCap:
      typeof data.marketCapitalization === "number" && data.marketCapitalization > 0
        ? data.marketCapitalization * 1e6
        : null,
    ipo: data.ipo || null,
    website: isWebUrl(data.weburl) ? data.weburl : null,
  };
}

/** Shortens Finnhub exchange names, e.g. "NASDAQ NMS - GLOBAL MARKET" -> "NASDAQ". */
export function shortExchangeName(name) {
  if (!name) return null;
  const upper = String(name).toUpperCase();
  if (upper.includes("NASDAQ")) return "NASDAQ";
  if (upper.includes("NEW YORK STOCK EXCHANGE")) return "NYSE";
  return String(name);
}

/** True only for http(s) URLs — rejects javascript:, data: and the like. */
export function isWebUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

/**
 * Sliding-window limiter: `take()` returns false once `max` calls have been
 * made in the last `windowMs` milliseconds.
 */
export function createRateLimiter(max, windowMs, now = () => Date.now()) {
  let calls = [];
  return {
    take() {
      const t = now();
      calls = calls.filter((c) => t - c < windowMs);
      if (calls.length >= max) return false;
      calls.push(t);
      return true;
    },
  };
}
