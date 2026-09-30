import { describe, expect, it } from "vitest";
import {
  createRateLimiter,
  isWebUrl,
  normalizeProfile,
  normalizeQuote,
  parseBars,
  parseSymbols,
  shortExchangeName,
} from "../netlify/lib/utils.mjs";

describe("parseSymbols", () => {
  it("uppercases, trims and de-duplicates tickers", () => {
    expect(parseSymbols(" aapl, MSFT ,aapl", 5)).toEqual(["AAPL", "MSFT"]);
  });

  it("drops invalid tickers", () => {
    expect(parseSymbols("AAPL,<script>,a b,,BRK.B", 5)).toEqual(["AAPL", "BRK.B"]);
  });

  it("respects the maximum", () => {
    expect(parseSymbols("A,B,C,D,E,F", 3)).toEqual(["A", "B", "C"]);
  });

  it("handles missing input", () => {
    expect(parseSymbols(null, 3)).toEqual([]);
  });
});

describe("normalizeQuote", () => {
  it("computes change and percent change", () => {
    const q = normalizeQuote("AAPL", { c: 110, pc: 100 });
    expect(q).toMatchObject({ symbol: "AAPL", currentPrice: 110, previousClose: 100, change: 10 });
    expect(q.changePercent).toBeCloseTo(10);
  });

  it("treats Finnhub's all-zero response for unknown symbols as no data", () => {
    expect(normalizeQuote("ZZZZ", { c: 0, pc: 0 })).toEqual({
      symbol: "ZZZZ",
      currentPrice: null,
      previousClose: null,
      change: null,
      changePercent: null,
    });
  });

  it("does not divide by zero", () => {
    expect(normalizeQuote("X", { c: 5, pc: 0 }).changePercent).toBeNull();
  });
});

describe("parseBars", () => {
  it("converts strings to numbers and trims timestamps to dates", () => {
    expect(
      parseBars([
        { datetime: "2026-09-29", open: "1.5", high: "2", low: "1", close: "1.75", volume: "100" },
      ])
    ).toEqual([{ time: "2026-09-29", open: 1.5, high: 2, low: 1, close: 1.75, volume: 100 }]);
  });

  it("drops malformed bars", () => {
    expect(
      parseBars([
        { datetime: "bad", open: "1", high: "1", low: "1", close: "1" },
        { datetime: "2026-01-02", open: "x", high: "1", low: "1", close: "1" },
      ])
    ).toEqual([]);
  });
});

describe("normalizeProfile", () => {
  it("returns null when Finnhub has no profile", () => {
    expect(normalizeProfile("ZZZZ", {})).toBeNull();
  });

  it("converts market cap from millions and rejects unsafe URLs", () => {
    const p = normalizeProfile("AAPL", {
      name: "Apple Inc",
      marketCapitalization: 3000000,
      logo: "javascript:alert(1)",
      weburl: "https://apple.com",
    });
    expect(p.marketCap).toBe(3e12);
    expect(p.logo).toBeNull();
    expect(p.website).toBe("https://apple.com");
  });
});

describe("shortExchangeName", () => {
  it("shortens common exchange names", () => {
    expect(shortExchangeName("NASDAQ NMS - GLOBAL MARKET")).toBe("NASDAQ");
    expect(shortExchangeName("NEW YORK STOCK EXCHANGE, INC.")).toBe("NYSE");
    expect(shortExchangeName("NIGERIAN STOCK EXCHANGE")).toBe("NGX");
    expect(shortExchangeName("LONDON STOCK EXCHANGE")).toBe("LONDON STOCK EXCHANGE");
    expect(shortExchangeName("")).toBeNull();
  });
});

describe("isWebUrl", () => {
  it("accepts only http(s) links", () => {
    expect(isWebUrl("https://cnbc.com/a")).toBe(true);
    expect(isWebUrl("http://x.com")).toBe(true);
    expect(isWebUrl("javascript:alert(1)")).toBe(false);
    expect(isWebUrl("data:text/html,hi")).toBe(false);
    expect(isWebUrl(undefined)).toBe(false);
  });
});

describe("createRateLimiter", () => {
  it("allows up to max calls per window, then recovers", () => {
    let t = 0;
    const limiter = createRateLimiter(2, 60000, () => t);
    expect(limiter.take()).toBe(true);
    expect(limiter.take()).toBe(true);
    expect(limiter.take()).toBe(false);
    t = 60001;
    expect(limiter.take()).toBe(true);
  });
});
