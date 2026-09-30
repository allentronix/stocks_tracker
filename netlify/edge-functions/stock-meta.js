/**
 * Edge function for /stock/:symbol pages.
 *
 * The app renders in the browser, but link-preview crawlers (WhatsApp,
 * LinkedIn, X, Slack…) don't run JavaScript, so every stock page would show
 * the generic home page preview. This rewrites the <head> of the served
 * index.html with a title/description for the requested stock.
 */

const SITE_URL = "https://istocktracker.netlify.app";

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

async function lookupCompanyName(origin, symbol) {
  try {
    // Served from the CDN cache for a day, so this rarely reaches Finnhub.
    const res = await fetch(`${origin}/api/profile?symbol=${encodeURIComponent(symbol)}`, {
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.profile?.name || null;
  } catch {
    return null;
  }
}

function setMeta(html, attr, key, value) {
  const pattern = new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`);
  return html.replace(pattern, `$1${value}$2`);
}

export default async (request, context) => {
  const response = await context.next();
  if (!(response.headers.get("content-type") || "").includes("text/html")) return response;

  const url = new URL(request.url);
  const match = url.pathname.match(/^\/stock\/([^/]+)\/?$/);
  if (!match) return response;
  let symbol;
  try {
    symbol = decodeURIComponent(match[1]).toUpperCase();
  } catch {
    return response;
  }
  if (!/^[A-Z0-9.:^-]{1,20}$/.test(symbol)) return response;

  const name = await lookupCompanyName(url.origin, symbol);
  const label = name ? `${symbol} (${name})` : symbol;
  const title = escapeHtml(`${label} Stock Price, Chart & Alerts | Stock Tracker`);
  const description = escapeHtml(
    `Live ${label} stock price, interactive candlestick chart with 5 years of history, and free price alerts.`
  );
  const pageUrl = escapeHtml(`${SITE_URL}/stock/${encodeURIComponent(symbol)}`);

  let html = await response.text();
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${pageUrl}$2`);
  html = setMeta(html, "name", "description", description);
  html = setMeta(html, "property", "og:url", pageUrl);
  html = setMeta(html, "property", "og:title", title);
  html = setMeta(html, "property", "og:description", description);
  html = setMeta(html, "name", "twitter:title", title);
  html = setMeta(html, "name", "twitter:description", description);

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(html, { status: response.status, headers });
};

export const config = { path: "/stock/*" };
