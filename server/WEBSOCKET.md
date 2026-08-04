# Gateway WebSocket (watchlist pub/sub)

## Run

The WebSocket client connects to **`ws://localhost:4000/ws`** (see `getWebSocketUrl()`). If only Vite is running (`npm run dev`), nothing listens on port **4000**, so the socket will stay **connecting / error / reconnecting**.

**Option A — one command (Vite + gateway):**

```bash
npm run dev:all
```

**Option B — two terminals:**

1. **API gateway** (HTTP + SSE + WebSocket):

   ```bash
   npm run dev:server
   ```

   Default: `http://localhost:4000`, WebSocket at `ws://localhost:4000/ws`.

2. **Vite app:**

   ```bash
   npm run dev
   ```

3. Optional env for the browser (defaults match local gateway):

   - `VITE_API_BASE_URL` — e.g. `http://localhost:4000`
   - `VITE_WS_URL` — override full WebSocket URL (otherwise derived from `VITE_API_BASE_URL` as `ws://…/ws` or `wss://…/ws`)

Server env (see `.env`): `FINNHUB_API_KEY`, `POLYGON_API_KEY` (or `VITE_*` fallbacks).

## Message format

### Client → server

Subscribe to up to **3** symbols (uppercase recommended):

```json
{ "type": "subscribe", "symbols": ["AAPL", "MSFT", "NVDA"] }
```

### Server → client

- **hello** (on connect):

  ```json
  { "type": "hello", "message": "send { type: subscribe, symbols: string[] } (max 3)" }
  ```

- **subscribed** (after a valid `subscribe`):

  ```json
  { "type": "subscribed", "symbols": ["AAPL", "MSFT"] }
  ```

- **prices** (after cache refresh or immediately after subscribe if quotes exist):

  ```json
  {
    "type": "prices",
    "quotes": [
      {
        "symbol": "AAPL",
        "currentPrice": 190.12,
        "previousClose": 189.5,
        "change": 0.62,
        "changePercent": 0.33
      }
    ],
    "lastUpdatedAt": "2026-04-01T12:00:00.000Z"
  }
  ```

- **error** (bad JSON or wrong shape):

  ```json
  { "type": "error", "message": "expected { type: \"subscribe\", symbols: string[] }" }
  ```

## Rate limits

Upstream Finnhub calls are **deduplicated** per poll: the server fetches the union of the top-10 list and all WebSocket–subscribed symbols **once per symbol** per price tick (same interval as before), not once per browser.

When the **market is closed**, the gateway **does not** call Finnhub on `subscribe` (same rule as the scheduled price poll). Watchlist rows only show prices already in the server cache from when the session was open, otherwise **—**.
