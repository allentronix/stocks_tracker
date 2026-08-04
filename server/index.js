/* eslint-env node */
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(cors());

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

const MARKET_POLL_INTERVAL_MS = 60000;
const PRICES_POLL_INTERVAL_MS = 120000;
const API_WINDOW_START = 9 + 25 / 60;
const API_WINDOW_END = 16 + 5 / 60;
const MAX_WS_SUBSCRIBE = 3;

const FINNHUB_API_KEY =
  process.env.FINNHUB_API_KEY || process.env.VITE_FINNHUB_API_KEY;
const POLYGON_API_KEY =
  process.env.POLYGON_API_KEY || process.env.VITE_POLYGON_API_KEY;

const sseClients = new Set();

/** @type {Record<string, { symbol: string, currentPrice: number, previousClose: number, change: number, changePercent: number }>} */
const symbolQuoteCache = {};

let marketStatusCache = {
  isOpen: false,
  reason: "outside_hours",
  message: "Market Closed",
  currentTime: new Date().toISOString(),
};

let topTenStocksCache = [];
let lastPricesFetchAt = 0;

/** @type {import('ws').WebSocketServer | null} */
let wss = null;

function getETTimeInfo() {
  const now = new Date();
  const etTimeString = now.toLocaleString("en-US", {
    timeZone: "America/New_York",
    hour12: false,
  });
  const etTime = new Date(etTimeString);
  const day = etTime.getDay();
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const timeInHours = hours + minutes / 60;
  const isWeekend = day === 0 || day === 6;
  return { etTime, day, timeInHours, isWeekend };
}

function checkMarketStatusFallback() {
  const { etTime, day, timeInHours } = getETTimeInfo();
  const isWeekend = day === 0 || day === 6;
  const isWithinMarketHours = timeInHours >= 9.5 && timeInHours < 16;

  if (isWeekend) {
    return {
      isOpen: false,
      reason: "weekend",
      message: "Market Closed (Weekend)",
      currentTime: etTime.toISOString(),
    };
  }

  if (isWithinMarketHours) {
    return {
      isOpen: true,
      reason: "open",
      message: "Market Open",
      currentTime: etTime.toISOString(),
    };
  }

  return {
    isOpen: false,
    reason: "outside_hours",
    message: "Market Closed (Outside Hours)",
    currentTime: etTime.toISOString(),
  };
}

function shouldCallPolygonAPI() {
  const { timeInHours, isWeekend } = getETTimeInfo();
  if (isWeekend) return false;
  return timeInHours >= API_WINDOW_START && timeInHours <= API_WINDOW_END;
}

function buildSnapshot() {
  return {
    marketStatus: marketStatusCache,
    topTenStocks: topTenStocksCache,
    lastUpdatedAt: new Date().toISOString(),
  };
}

function broadcastSnapshot() {
  const payload = `data: ${JSON.stringify(buildSnapshot())}\n\n`;
  for (const client of sseClients) {
    client.write(payload);
  }
}

function symbolsUnionForFetch() {
  const set = new Set(TOP_TEN_SYMBOLS);
  if (wss) {
    for (const client of wss.clients) {
      const subs = client.subscribedSymbols;
      if (subs && subs.size) {
        for (const s of subs) set.add(s);
      }
    }
  }
  return [...set];
}

function broadcastWsSubscribers() {
  if (!wss) return;
  const lastUpdatedAt = new Date().toISOString();
  for (const ws of wss.clients) {
    if (ws.readyState !== 1) continue;
    const symbols = [...(ws.subscribedSymbols || [])];
    const quotes = symbols
      .map((s) => symbolQuoteCache[s])
      .filter(Boolean);
    try {
      ws.send(
        JSON.stringify({
          type: "prices",
          quotes,
          lastUpdatedAt,
        })
      );
    } catch {
      // ignore broken pipe
    }
  }
}

async function fetchPolygonMarketOpen() {
  if (!POLYGON_API_KEY) return null;
  const url = `https://api.polygon.io/v1/marketstatus/now?apiKey=${POLYGON_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Polygon API returned ${response.status}`);
  const data = await response.json();
  return (
    data.market === "open" ||
    data.status === "open" ||
    data.markets?.stocks === "open"
  );
}

async function updateMarketStatusCache() {
  const jsStatus = checkMarketStatusFallback();
  let finalStatus = jsStatus;

  if (jsStatus.reason === "open" && shouldCallPolygonAPI()) {
    try {
      const apiIsOpen = await fetchPolygonMarketOpen();
      if (apiIsOpen === null) {
        finalStatus = jsStatus;
      } else if (apiIsOpen) {
        finalStatus = {
          isOpen: true,
          reason: "open",
          message: "Market Open",
          currentTime: new Date().toISOString(),
        };
      } else {
        finalStatus = {
          isOpen: false,
          reason: "holiday",
          message: "Market Closed (Holiday)",
          currentTime: new Date().toISOString(),
        };
      }
    } catch {
      finalStatus = jsStatus;
    }
  }

  marketStatusCache = finalStatus;
}

async function fetchStockQuote(symbol) {
  if (!FINNHUB_API_KEY) return null;
  const response = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`
  );
  if (!response.ok) throw new Error(`Finnhub API returned ${response.status}`);
  const data = await response.json();
  const c = data.c;
  const pc = data.pc;
  const hasC = typeof c === "number" && !Number.isNaN(c);
  const hasPc = typeof pc === "number" && !Number.isNaN(pc);
  return {
    symbol,
    currentPrice: hasC ? c : null,
    previousClose: hasPc ? pc : null,
    change: hasC && hasPc ? c - pc : null,
    changePercent:
      hasC && hasPc && pc !== 0 ? ((c - pc) / pc) * 100 : null,
  };
}

function rebuildTopTenFromCache() {
  topTenStocksCache = TOP_TEN_SYMBOLS.map((s) => symbolQuoteCache[s]).filter(
    Boolean
  );
}

/** Fetches quotes for given symbols (e.g. on WS subscribe). Works when market is closed—Finnhub still returns last/previous. */
async function ensureQuotesForSymbols(symbols) {
  if (!symbols.length || !FINNHUB_API_KEY) return;
  const unique = [...new Set(symbols)];
  const results = await Promise.all(
    unique.map((symbol) => fetchStockQuote(symbol).catch(() => null))
  );
  for (let i = 0; i < unique.length; i++) {
    const row = results[i];
    if (row) symbolQuoteCache[unique[i]] = row;
  }
  rebuildTopTenFromCache();
}

/**
 * Single upstream batch: union(top 10, all WS-subscribed symbols).
 * One Finnhub call per unique symbol per poll cycle.
 */
async function refreshSymbolQuoteCache() {
  if (!marketStatusCache.isOpen) return;

  const now = Date.now();
  if (lastPricesFetchAt && now - lastPricesFetchAt < PRICES_POLL_INTERVAL_MS) {
    return;
  }

  const allSymbols = symbolsUnionForFetch();
  const results = await Promise.all(
    allSymbols.map((symbol) => fetchStockQuote(symbol).catch(() => null))
  );

  for (let i = 0; i < allSymbols.length; i++) {
    const row = results[i];
    if (row) symbolQuoteCache[allSymbols[i]] = row;
  }

  rebuildTopTenFromCache();
  lastPricesFetchAt = Date.now();
}

let marketInFlight = false;
let pricesInFlight = false;

async function runMarketTick() {
  if (marketInFlight) return;
  marketInFlight = true;
  try {
    await updateMarketStatusCache();
    broadcastSnapshot();
    broadcastWsSubscribers();
  } finally {
    marketInFlight = false;
  }
}

async function runPricesTick() {
  if (pricesInFlight) return;
  pricesInFlight = true;
  try {
    await refreshSymbolQuoteCache();
    broadcastSnapshot();
    broadcastWsSubscribers();
  } finally {
    pricesInFlight = false;
  }
}

function startPolling() {
  runMarketTick();
  runPricesTick();

  setInterval(runMarketTick, MARKET_POLL_INTERVAL_MS);
  setInterval(runPricesTick, PRICES_POLL_INTERVAL_MS);
}

app.get("/api/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  sseClients.add(res);
  res.write(`data: ${JSON.stringify(buildSnapshot())}\n\n`);

  req.on("close", () => {
    sseClients.delete(res);
  });
});

app.get("/api/snapshot", (_req, res) => {
  res.json(buildSnapshot());
});

const server = http.createServer(app);

wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws) => {
  ws.subscribedSymbols = new Set();

  ws.send(
    JSON.stringify({
      type: "hello",
      message: "send { type: subscribe, symbols: string[] } (max 3)",
    })
  );

  ws.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "invalid JSON" }));
      return;
    }

    if (msg.type !== "subscribe" || !Array.isArray(msg.symbols)) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: 'expected { type: "subscribe", symbols: string[] }',
        })
      );
      return;
    }

    const normalized = [
      ...new Set(
        msg.symbols
          .map((s) => String(s || "").toUpperCase().trim())
          .filter(Boolean)
      ),
    ].slice(0, MAX_WS_SUBSCRIBE);

    ws.subscribedSymbols = new Set(normalized);

    // Match scheduled price poll: no Finnhub calls when market is closed.
    if (marketStatusCache.isOpen) {
      await ensureQuotesForSymbols(normalized);
    }

    ws.send(
      JSON.stringify({
        type: "subscribed",
        symbols: normalized,
      })
    );

    broadcastSnapshot();
    broadcastWsSubscribers();
  });

  ws.on("close", () => {
    ws.subscribedSymbols = new Set();
  });
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `[gateway] Port ${PORT} is already in use.\n` +
        `  • Stop the other server (e.g. another terminal running npm run dev:server or dev:all), or\n` +
        `  • Free the port: lsof -i :${PORT}   then   kill -9 <PID>\n` +
        `  • Or use a different port: PORT=4001 npm run dev:server`
    );
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  startPolling();
  console.log(`API gateway running on port ${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}/ws`);
});
