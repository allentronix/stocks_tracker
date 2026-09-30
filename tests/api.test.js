import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The function keeps in-memory caches at module level, so each test loads a
// fresh copy and replaces `fetch` with a fake upstream API.
async function loadHandler() {
  vi.resetModules();
  return (await import("../netlify/functions/api.mjs")).default;
}

const call = (handler, path, init) =>
  handler(new Request(`https://example.test${path}`, init));

function mockUpstream(respond) {
  const fetchMock = vi.fn(async (url) => {
    const body = respond(String(url));
    return new Response(JSON.stringify(body), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.stubEnv("FINNHUB_API_KEY", "test-finnhub");
  vi.stubEnv("TWELVE_DATA_KEY", "test-twelve");
  vi.stubEnv("NEWSAPI_KEY", "test-news");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("routing and request checks", () => {
  it("returns 404 for unknown routes, including Object builtins", async () => {
    const handler = await loadHandler();
    for (const path of ["/api/nope", "/api/constructor", "/api/__proto__"]) {
      expect((await call(handler, path)).status).toBe(404);
    }
  });

  it("rejects non-GET methods", async () => {
    const handler = await loadHandler();
    expect((await call(handler, "/api/news", { method: "POST" })).status).toBe(405);
  });

  it("requires a valid symbol", async () => {
    const handler = await loadHandler();
    expect((await call(handler, "/api/quote?symbol=%3Cscript%3E")).status).toBe(400);
  });
});

describe("caching and quota protection", () => {
  it("serves repeated quote requests from memory (one upstream call)", async () => {
    const handler = await loadHandler();
    const fetchMock = mockUpstream(() => ({ c: 110, pc: 100 }));
    await call(handler, "/api/quote?symbol=AAPL");
    await call(handler, "/api/quote?symbol=aapl");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("marks cacheable responses so junk query params can't bypass the CDN", async () => {
    const handler = await loadHandler();
    mockUpstream(() => ({ c: 110, pc: 100 }));
    const res = await call(handler, "/api/quote?symbol=AAPL&junk=1");
    expect(res.headers.get("Netlify-Vary")).toBe("query=symbol|symbols|q");
  });

  it("stops calling Twelve Data after 7 chart requests in a minute", async () => {
    const handler = await loadHandler();
    const fetchMock = mockUpstream(() => ({
      status: "ok",
      values: [{ datetime: "2026-09-29", open: "1", high: "2", low: "1", close: "2", volume: "5" }],
    }));
    const statuses = [];
    for (let i = 0; i < 8; i++) {
      statuses.push((await call(handler, `/api/history?symbol=S${i}`)).status);
    }
    expect(statuses.slice(0, 7)).toEqual(Array(7).fill(200));
    expect(statuses[7]).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(7);
  });

  it("never sends API keys back to the browser", async () => {
    const handler = await loadHandler();
    mockUpstream(() => ({ c: 110, pc: 100 }));
    const text = await (await call(handler, "/api/quote?symbol=AAPL")).text();
    expect(text).not.toContain("test-finnhub");
  });
});

describe("news", () => {
  it("drops articles with non-web links", async () => {
    const handler = await loadHandler();
    mockUpstream(() => ({
      status: "ok",
      articles: [
        { title: "Good", url: "https://cnbc.com/a", source: { name: "CNBC" } },
        { title: "Bad", url: "javascript:alert(1)", source: { name: "X" } },
      ],
    }));
    const data = await (await call(handler, "/api/news")).json();
    expect(data.articles.map((a) => a.title)).toEqual(["Good"]);
  });
});
