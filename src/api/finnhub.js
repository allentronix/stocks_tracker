export async function fetchQuote(symbol) {
    const apiKey = import.meta.env.VITE_FINNHUB_API_KEY;
    const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);
    const data = await response.json();
    return data; // { c: current price, h: high, l: low, o: open, pc: previous close }
}
export async function searchSymbol(query) {
    const apiKey = import.meta.env.VITE_FINNHUB_API_KEY;
    const response = await fetch(`https://finnhub.io/api/v1/search?q=${query}&token=${apiKey}`);
    const data = await response.json();
    return data.result; // returns an array of matches
  }
  