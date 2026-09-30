/* eslint-env node */
/**
 * Serverless API gateway (Netlify Function) — replaces the long-running
 * Express/SSE/WebSocket server so the whole app can be hosted on Netlify.
 * All third-party API keys stay server-side; the browser only calls /api/*.
 *
 * Routes:
 *   GET /api/snapshot            market status + top 10 quotes
 *   GET /api/quotes?symbols=A,B  normalized quotes (max 3 symbols)
 *   GET /api/quote?symbol=A      raw Finnhub quote { c, o, h, l, pc }
 *   GET /api/search?q=apple      Finnhub symbol search results
 *   GET /api/history?symbol=A    ~5 years of daily OHLCV bars (Twelve Data)
 *   GET /api/news                market news headlines (NewsAPI)
 *
 * Free-tier limits and how each is respected:
 *   Finnhub     60/min   — CDN cache (60s open / 10min closed) + 30s in-memory quote cache
 *   Twelve Data 8/min, 800/day — history only; one call per symbol covers every
 *               chart range, CDN + in-memory cache 1h, local 7/min guard
 *   Polygon     5/min    — market status only during trading hours, cached 5min
 *   NewsAPI     100/day  — CDN cache 2h (~12 calls/day)
 */

const TOP_TEN_SYMBOLS = [
  "AAPL",
  "MSFT",
  "GOOGL",
  "AMZN",
  "TSLA",
  "NVDA",
  "META",
  "NFLX",
  "INTC",
  "CSCO",
];

const MAX_WATCHLIST_SYMBOLS = 3;

const env = (name) => process.env[name] || process.env[`VITE_${name}`];

function json(body, { status = 200, maxAge = 0 } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (maxAge > 0 && status === 200) {
    // Cache on Netlify's CDN so many visitors share one upstream call.
    headers["Cache-Control"] = "public, max-age=0, must-revalidate";
    headers["Netlify-CDN-Cache-Control"] = `public, durable, s-maxage=${maxAge}, stale-while-revalidate=${maxAge}`;
  } else {
    headers["Cache-Control"] = "no-store";
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function parseSymbols(raw, max) {
  return [
    ...new Set(
      String(raw || "")
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter((s) => /^[A-Z0-9.:\-^]{1,20}$/.test(s))
    ),
  ].slice(0, max);
}

// ---------------------------------------------------------------------------
// Market status
// ---------------------------------------------------------------------------

function getETTimeInfo() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const weekday = get("weekday");
  const timeInHours = Number(get("hour")) + Number(get("minute")) / 60;
  const isWeekend = weekday === "Sat" || weekday === "Sun";
  return { timeInHours, isWeekend };
}

function checkMarketStatusFallback() {
  const { timeInHours, isWeekend } = getETTimeInfo();
  const currentTime = new Date().toISOString();
  if (isWeekend) {
    return { isOpen: false, reason: "weekend", message: "Market Closed (Weekend)", currentTime };
  }
  if (timeInHours >= 9.5 && timeInHours < 16) {
    return { isOpen: true, reason: "open", message: "Market Open", currentTime };
  }
  return {
    isOpen: false,
    reason: "outside_hours",
    message: "Market Closed (Outside Hours)",
    currentTime,
  };
}

async function fetchPolygonMarketOpen() {
  const key = env("POLYGON_API_KEY");
  if (!key) return null;
  const response = await fetch(
    `https://api.polygon.io/v1/marketstatus/now?apiKey=${key}`
  );
  if (!response.ok) throw new Error(`Polygon API returned ${response.status}`);
  const data = await response.json();
  return (
    data.market === "open" ||
    data.status === "open" ||
    data.markets?.stocks === "open"
  );
}

const POLYGON_TTL_MS = 5 * 60 * 1000;
let polygonCache = { at: 0, isOpen: null };

/** Time-based status, confirmed with Polygon during trading hours (catches holidays). */
async function getMarketStatus() {
  const jsStatus = checkMarketStatusFallback();
  if (!jsStatus.isOpen) return jsStatus;
  try {
    if (Date.now() - polygonCache.at > POLYGON_TTL_MS) {
      polygonCache = { at: Date.now(), isOpen: await fetchPolygonMarketOpen() };
    }
    if (polygonCache.isOpen === false) {
      return { ...jsStatus, isOpen: false, reason: "holiday", message: "Market Closed (Holiday)" };
    }
  } catch {
    // fall back to the time-based status
  }
  return jsStatus;
}

// ---------------------------------------------------------------------------
// Finnhub
// ---------------------------------------------------------------------------

async function finnhub(path, params) {
  const key = env("FINNHUB_API_KEY");
  if (!key) throw new Error("FINNHUB_API_KEY is not configured");
  const qs = new URLSearchParams({ ...params, token: key });
  const response = await fetch(`https://finnhub.io/api/v1/${path}?${qs}`);
  if (!response.ok) throw new Error(`Finnhub API returned ${response.status}`);
  return response.json();
}

function normalizeQuote(symbol, data) {
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

// Short-lived per-instance cache so the snapshot, watchlist and detail views
// share quotes and stay under Finnhub's free-tier limit (60 calls/minute).
const QUOTE_TTL_MS = 30000;
const quoteCache = new Map();

async function getRawQuote(symbol) {
  const hit = quoteCache.get(symbol);
  if (hit && Date.now() - hit.at < QUOTE_TTL_MS) return hit.data;
  const data = await finnhub("quote", { symbol });
  quoteCache.set(symbol, { at: Date.now(), data });
  return data;
}

async function fetchQuotes(symbols) {
  const results = await Promise.all(
    symbols.map((symbol) =>
      getRawQuote(symbol)
        .then((data) => normalizeQuote(symbol, data))
        .catch(() => null)
    )
  );
  return results.filter(Boolean);
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

async function handleSnapshot() {
  const marketStatus = await getMarketStatus();
  const topTenStocks = await fetchQuotes(TOP_TEN_SYMBOLS);
  return json(
    { marketStatus, topTenStocks, lastUpdatedAt: new Date().toISOString() },
    // Refresh every minute while open; prices don't move while closed.
    { maxAge: marketStatus.isOpen ? 60 : 600 }
  );
}

async function handleQuotes(url) {
  const symbols = parseSymbols(url.searchParams.get("symbols"), MAX_WATCHLIST_SYMBOLS);
  if (!symbols.length) return json({ quotes: [] });
  const quotes = await fetchQuotes(symbols);
  return json({ quotes, lastUpdatedAt: new Date().toISOString() }, { maxAge: 60 });
}

async function handleQuote(url) {
  const [symbol] = parseSymbols(url.searchParams.get("symbol"), 1);
  if (!symbol) return json({ error: "symbol is required" }, { status: 400 });
  const data = await getRawQuote(symbol);
  return json(data, { maxAge: 30 });
}

async function handleSearch(url) {
  const q = String(url.searchParams.get("q") || "").trim().slice(0, 50);
  if (!q) return json({ result: [] });
  const data = await finnhub("search", { q });
  return json({ result: Array.isArray(data.result) ? data.result : [] }, { maxAge: 3600 });
}

// ---------------------------------------------------------------------------
// Twelve Data (chart history)
// ---------------------------------------------------------------------------

const HISTORY_TTL_MS = 60 * 60 * 1000; // daily bars: refreshing hourly is plenty
const HISTORY_BARS = 1300; // ~5 years of trading days, still 1 API credit
const TWELVE_DATA_MAX_PER_MIN = 7; // plan allows 8; keep one spare
const historyCache = new Map();
let twelveDataCalls = [];

function takeTwelveDataSlot() {
  const now = Date.now();
  twelveDataCalls = twelveDataCalls.filter((t) => now - t < 60000);
  if (twelveDataCalls.length >= TWELVE_DATA_MAX_PER_MIN) return false;
  twelveDataCalls.push(now);
  return true;
}

async function fetchHistory(symbol) {
  const key = env("TWELVE_DATA_KEY");
  if (!key) throw new Error("TWELVE_DATA_KEY is not configured");
  const qs = new URLSearchParams({
    symbol,
    interval: "1day",
    outputsize: String(HISTORY_BARS),
    order: "ASC",
    apikey: key,
  });
  const response = await fetch(`https://api.twelvedata.com/time_series?${qs}`);
  const data = await response.json();
  if (data.status === "error" || !Array.isArray(data.values)) {
    const err = new Error(data.message || `Twelve Data API returned ${response.status}`);
    err.status = data.code === 429 ? 429 : data.code === 404 || data.code === 400 ? 404 : 502;
    throw err;
  }
  return data.values
    .map((v) => ({
      time: v.datetime.slice(0, 10),
      open: Number(v.open),
      high: Number(v.high),
      low: Number(v.low),
      close: Number(v.close),
      volume: Number(v.volume) || 0,
    }))
    .filter((b) => [b.open, b.high, b.low, b.close].every(Number.isFinite));
}

async function handleHistory(url) {
  const [symbol] = parseSymbols(url.searchParams.get("symbol"), 1);
  if (!symbol) return json({ error: "symbol is required" }, { status: 400 });

  const hit = historyCache.get(symbol);
  if (hit && Date.now() - hit.at < HISTORY_TTL_MS) {
    return json({ symbol, bars: hit.bars }, { maxAge: 3600 });
  }

  if (!takeTwelveDataSlot()) {
    // Serve stale data rather than exceed the per-minute limit.
    if (hit) return json({ symbol, bars: hit.bars, stale: true }, { maxAge: 60 });
    return json({ error: "Chart data is busy, try again in a minute." }, { status: 429 });
  }

  try {
    const bars = await fetchHistory(symbol);
    historyCache.set(symbol, { at: Date.now(), bars });
    return json({ symbol, bars }, { maxAge: 3600 });
  } catch (error) {
    if (hit) return json({ symbol, bars: hit.bars, stale: true }, { maxAge: 60 });
    const status = error.status || 502;
    const message =
      status === 404
        ? `No chart data available for ${symbol}.`
        : status === 429
          ? "Chart data is busy, try again in a minute."
          : error.message;
    return json({ error: message }, { status });
  }
}

async function handleNews() {
  const key = env("NEWSAPI_KEY");
  if (!key) return json({ error: "NEWSAPI_KEY is not configured" }, { status: 500 });
  const qs = new URLSearchParams({
    q: "(stock market OR wall street OR nasdaq OR dow jones OR S&P 500) AND (NYSE OR NASDAQ OR trading)",
    domains:
      "bloomberg.com,cnbc.com,reuters.com,wsj.com,marketwatch.com,ft.com,businessinsider.com,finance.yahoo.com,forbes.com,seekingalpha.com",
    language: "en",
    sortBy: "publishedAt",
    pageSize: "20",
    apiKey: key,
  });
  const response = await fetch(`https://newsapi.org/v2/everything?${qs}`, {
    headers: { "User-Agent": "stock-tracker" },
  });
  const data = await response.json();
  if (!response.ok || data.status === "error") {
    return json(
      { error: data.message || `NewsAPI returned ${response.status}` },
      { status: response.status === 429 ? 429 : 502 }
    );
  }
  const articles = (data.articles || [])
    .filter((a) => a.title && a.title !== "[Removed]" && a.url && a.source?.name)
    .map((a) => ({
      title: a.title,
      url: a.url,
      source: a.source.name,
      publishedAt: a.publishedAt,
      description: a.description,
    }))
    .slice(0, 15);
  // NewsAPI free tier is 100 requests/day — cache for 2 hours.
  return json({ articles }, { maxAge: 7200 });
}

const routes = {
  snapshot: handleSnapshot,
  quotes: handleQuotes,
  quote: handleQuote,
  search: handleSearch,
  history: handleHistory,
  news: handleNews,
};

export default async (req) => {
  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  const handler = routes[route];
  if (!handler) return json({ error: "Not found" }, { status: 404 });
  try {
    return await handler(url);
  } catch (error) {
    console.error(`[api/${route}]`, error);
    return json({ error: error.message || "Upstream error" }, { status: 502 });
  }
};

export const config = { path: "/api/*" };
