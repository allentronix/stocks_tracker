import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  createChart,
} from "lightweight-charts";
import { apiGet } from "../config/api";
import LoadingSpinner from "./LoadingSpinner";

const UP = "#34d399";
const DOWN = "#f87171";

const RANGES = [
  { id: "1M", months: 1 },
  { id: "3M", months: 3 },
  { id: "6M", months: 6 },
  { id: "1Y", months: 12 },
  { id: "5Y", months: 60 },
];

// One API call per symbol returns ~5 years of daily bars; every range is a
// slice of that, and the result is cached in the browser for an hour.
const CACHE_PREFIX = "chartHistory:";
const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHED_SYMBOLS = 8;
const memoryCache = new Map();

function readCache(symbol) {
  const mem = memoryCache.get(symbol);
  if (mem && Date.now() - mem.at < CACHE_TTL_MS) return mem.bars;
  try {
    const stored = JSON.parse(localStorage.getItem(CACHE_PREFIX + symbol));
    if (stored && Date.now() - stored.at < CACHE_TTL_MS && Array.isArray(stored.bars)) {
      memoryCache.set(symbol, stored);
      return stored.bars;
    }
  } catch {
    // ignore unreadable cache
  }
  return null;
}

function writeCache(symbol, bars) {
  const entry = { at: Date.now(), bars };
  memoryCache.set(symbol, entry);
  try {
    // Keep storage bounded: drop the oldest cached symbols.
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX));
    if (keys.length >= MAX_CACHED_SYMBOLS) {
      keys
        .map((k) => [k, JSON.parse(localStorage.getItem(k))?.at || 0])
        .sort((a, b) => a[1] - b[1])
        .slice(0, keys.length - MAX_CACHED_SYMBOLS + 1)
        .forEach(([k]) => localStorage.removeItem(k));
    }
    localStorage.setItem(CACHE_PREFIX + symbol, JSON.stringify(entry));
  } catch {
    // storage full or unavailable — memory cache still works
  }
}

function sliceRange(bars, months) {
  if (!bars.length) return bars;
  const cutoff = new Date(bars[bars.length - 1].time);
  cutoff.setMonth(cutoff.getMonth() - months);
  const from = cutoff.toISOString().slice(0, 10);
  return bars.filter((b) => b.time >= from);
}

const fmt = (v) =>
  v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function StockChart({ symbol }) {
  const containerRef = useRef(null);
  const [bars, setBars] = useState(() => readCache(symbol));
  const [error, setError] = useState(null);
  const [range, setRange] = useState("6M");
  const [chartType, setChartType] = useState("candles");
  const [hovered, setHovered] = useState(null);
  const symbolRef = useRef(symbol);
  symbolRef.current = symbol;

  const load = useCallback(async () => {
    const cached = readCache(symbol);
    if (cached) {
      setBars(cached);
      setError(null);
      return;
    }
    setBars(null);
    setError(null);
    try {
      const data = await apiGet(`history?symbol=${encodeURIComponent(symbol)}`);
      if (symbolRef.current !== symbol) return; // user moved on to another stock
      const next = Array.isArray(data?.bars) ? data.bars : [];
      if (!next.length) throw new Error(`No chart data available for ${symbol}.`);
      if (!data.stale) writeCache(symbol, next);
      setBars(next);
    } catch (err) {
      if (symbolRef.current !== symbol) return;
      setError(err.message || "Could not load chart data.");
    }
  }, [symbol]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    if (!bars) return [];
    const months = RANGES.find((r) => r.id === range)?.months ?? 6;
    return sliceRange(bars, months);
  }, [bars, range]);

  const first = visible[0];
  const last = visible[visible.length - 1];
  const rangeChange = first && last ? last.close - first.close : 0;
  const rangePct = first && last && first.close ? (rangeChange / first.close) * 100 : 0;
  const rangeUp = rangeChange >= 0;

  // (Re)build the chart when the data, range or chart type changes.
  useEffect(() => {
    const node = containerRef.current;
    if (!node || visible.length === 0) return;

    const chart = createChart(node, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#737373",
        fontFamily: "'Inter Variable', Inter, system-ui, sans-serif",
        fontSize: 11,
        attributionLogo: true,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(255,255,255,0.25)", labelBackgroundColor: "#262626" },
        horzLine: { color: "rgba(255,255,255,0.25)", labelBackgroundColor: "#262626" },
      },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.1, bottom: 0.25 } },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      handleScroll: false,
      handleScale: false,
    });

    const priceSeries =
      chartType === "candles"
        ? chart.addSeries(CandlestickSeries, {
            upColor: UP,
            downColor: DOWN,
            wickUpColor: UP,
            wickDownColor: DOWN,
            borderVisible: false,
          })
        : chart.addSeries(AreaSeries, {
            lineColor: rangeUp ? UP : DOWN,
            topColor: rangeUp ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.25)",
            bottomColor: "rgba(0,0,0,0)",
            lineWidth: 2,
          });

    priceSeries.setData(
      chartType === "candles"
        ? visible.map(({ time, open, high, low, close }) => ({ time, open, high, low, close }))
        : visible.map(({ time, close }) => ({ time, value: close }))
    );

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
      lastValueVisible: false,
      priceLineVisible: false,
    });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    volumeSeries.setData(
      visible.map((b) => ({
        time: b.time,
        value: b.volume,
        color: b.close >= b.open ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.25)",
      }))
    );

    chart.timeScale().fitContent();

    const barByTime = new Map(visible.map((b) => [b.time, b]));
    const onMove = (param) => {
      setHovered(param.time ? barByTime.get(param.time) || null : null);
    };
    chart.subscribeCrosshairMove(onMove);

    return () => {
      chart.unsubscribeCrosshairMove(onMove);
      chart.remove();
    };
  }, [visible, chartType, rangeUp]);

  const legend = hovered || last;

  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-950 p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-h-11">
          {legend && (
            <>
              <p className="text-xs text-neutral-500 tabular-nums">
                {new Date(`${legend.time}T00:00:00`).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                {!hovered && first && (
                  <span className={`ml-2 font-semibold ${rangeUp ? "text-emerald-400" : "text-red-400"}`}>
                    {rangeUp ? "+" : ""}
                    {rangePct.toFixed(2)}% over {range}
                  </span>
                )}
              </p>
              <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-neutral-400 tabular-nums">
                <span>O <span className="text-white">{fmt(legend.open)}</span></span>
                <span>H <span className="text-white">{fmt(legend.high)}</span></span>
                <span>L <span className="text-white">{fmt(legend.low)}</span></span>
                <span>C <span className="text-white">{fmt(legend.close)}</span></span>
              </p>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-white/10 p-0.5" role="group" aria-label="Chart type">
            {[
              ["candles", "Candles"],
              ["line", "Line"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setChartType(id)}
                aria-pressed={chartType === id}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  chartType === id ? "bg-white text-black" : "text-neutral-400 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex rounded-full border border-white/10 p-0.5" role="group" aria-label="Time range">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRange(r.id)}
                aria-pressed={range === r.id}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  range === r.id ? "bg-white text-black" : "text-neutral-400 hover:text-white"
                }`}
              >
                {r.id}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative h-80 sm:h-[420px]">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-neutral-400">{error}</p>
            <button
              type="button"
              onClick={load}
              className="rounded-full border border-white/10 px-4 py-1.5 text-xs text-neutral-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              Try again
            </button>
          </div>
        ) : !bars ? (
          <div className="flex h-full items-center justify-center">
            <LoadingSpinner label="Loading chart" />
          </div>
        ) : (
          <div ref={containerRef} className="h-full w-full" />
        )}
      </div>
    </div>
  );
}
