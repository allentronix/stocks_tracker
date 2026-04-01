/* eslint-env node */
import cors from "cors";
import dotenv from "dotenv";
import express from "express";

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

const FINNHUB_API_KEY =
  process.env.FINNHUB_API_KEY || process.env.VITE_FINNHUB_API_KEY;
const POLYGON_API_KEY =
  process.env.POLYGON_API_KEY || process.env.VITE_POLYGON_API_KEY;

const sseClients = new Set();

let marketStatusCache = {
  isOpen: false,
  reason: "outside_hours",
  message: "Market Closed",
  currentTime: new Date().toISOString(),
};

let topTenStocksCache = [];
let lastPricesFetchAt = 0;

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
  return {
    symbol,
    currentPrice: data.c,
    previousClose: data.pc,
    change: data.c - data.pc,
    changePercent: ((data.c - data.pc) / data.pc) * 100,
  };
}

async function updateTopTenStocksCache() {
  if (!marketStatusCache.isOpen) return;

  const now = Date.now();
  if (lastPricesFetchAt && now - lastPricesFetchAt < PRICES_POLL_INTERVAL_MS) {
    return;
  }

  const results = await Promise.all(
    TOP_TEN_SYMBOLS.map((symbol) =>
      fetchStockQuote(symbol).catch(() => null)
    )
  );

  topTenStocksCache = results.filter(Boolean);
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
  } finally {
    marketInFlight = false;
  }
}

async function runPricesTick() {
  if (pricesInFlight) return;
  pricesInFlight = true;
  try {
    await updateTopTenStocksCache();
    broadcastSnapshot();
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

app.listen(PORT, () => {
  startPolling();
  console.log(`API gateway running on port ${PORT}`);
});
