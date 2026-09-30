const formatters = new Map();

function getFormatter(currency, compact) {
  const key = `${currency}|${compact}`;
  if (!formatters.has(key)) {
    let formatter;
    try {
      formatter = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        currencyDisplay: "narrowSymbol", // ₦ instead of NGN, $ instead of US$
        ...(compact
          ? { notation: "compact", maximumFractionDigits: 2 }
          : { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      });
    } catch {
      // Unknown currency code from the API: fall back to US dollars.
      formatter = getFormatter("USD", compact);
    }
    formatters.set(key, formatter);
  }
  return formatters.get(key);
}

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Formats a price in the stock's own currency, e.g. $329.40 or ₦1,066.70.
 * Missing prices are shown as zero.
 */
export function formatMoney(value, currency = "USD") {
  return getFormatter(currency || "USD", false).format(toNumber(value));
}

/** Compact money for large values, e.g. $4.81T or ₦17.69T. */
export function formatCompactMoney(value, currency = "USD") {
  const n = toNumber(value);
  // Keep zero consistent with other prices ($0.00, not $0).
  if (n === 0) return formatMoney(0, currency);
  return getFormatter(currency || "USD", true).format(n);
}

/** Signed number with two decimals, e.g. +1.25 or -0.40; missing values are 0.00. */
export function formatSigned(value, suffix = "") {
  const n = toNumber(value);
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}${suffix}`;
}
