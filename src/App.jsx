import TopTen from "./components/TopTen";
import SearchBar from "./components/SearchBar";
import StockDetail from "./components/StockDetail";
import Watchlist from "./components/Watchlist";
import Alerts from "./components/Alerts";
import AlertNotification from "./components/AlertNotification";
import Header from "./components/Header";
import NewsTicker from "./components/NewsTicker";
import { useState, useEffect } from "react";
import { usePriceAlertsContext } from "./contexts/PriceAlertsContext";
import bgImage from "./assets/bg-image.jpg";
import { usePricesContext } from "./contexts/PricesContext";
import LoadingSpinner from "./components/LoadingSpinner";
const SITE_URL = "https://istocktracker.netlify.app";
const DEFAULT_TITLE = "Stock Tracker – Live Stock Prices, Charts & Price Alerts";
const DEFAULT_DESCRIPTION =
  "Free stock tracker with live prices for popular US stocks, interactive candlestick charts, a personal watchlist, price alerts and market news.";

/** Returns the ticker from a /stock/:symbol path, or null if it isn't valid. */
function parseStockPath(path) {
  const match = path.match(/^\/stock\/([^/]+)\/?$/);
  if (!match) return null;
  const symbol = decodeURIComponent(match[1]).toUpperCase();
  return /^[A-Z0-9.:^-]{1,20}$/.test(symbol) ? symbol : null;
}

/** Sets a <meta>/<link> value in <head>, creating the tag if needed. */
function setHeadTag(selector, attr, value, create) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

function App() {
  const [selectedStock, setSelectedStock] = useState(null);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const { triggeredAlerts, dismissTriggeredAlert } = usePriceAlertsContext();

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      // When browser back/forward is used, check the URL
      const path = window.location.pathname;
      if (path === "/" || path === "") {
        setSelectedStock(null);
        setShowWatchlist(false);
        setShowAlerts(false);
      } else if (path === "/watchlist") {
        setSelectedStock(null);
        setShowWatchlist(true);
        setShowAlerts(false);
      } else if (path === "/alerts") {
        setSelectedStock(null);
        setShowWatchlist(false);
        setShowAlerts(true);
      } else {
        // If there's a stock in the URL, parse it
        const symbol = parseStockPath(path);
        if (symbol) {
          setSelectedStock({ symbol });
          setShowWatchlist(false);
          setShowAlerts(false);
        }
      }
    };

    window.addEventListener("popstate", handlePopState);

    // Check initial URL on mount
    const path = window.location.pathname;
    if (path === "/watchlist") {
      setShowWatchlist(true);
    } else if (path === "/alerts") {
      setShowAlerts(true);
    } else {
      const symbol = parseStockPath(path);
      if (symbol) {
        setSelectedStock({ symbol });
      } else if (path !== "/") {
        // Unknown page: show home at its real URL instead of a soft 404.
        window.history.replaceState({}, "", "/");
      }
    }

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Update URL when stock selection or watchlist view changes.
  // Only push when the path differs, so initial load and back/forward
  // navigation don't add duplicate history entries.
  useEffect(() => {
    let path = "/";
    if (selectedStock) {
      path = `/stock/${encodeURIComponent(selectedStock.symbol)}`;
    } else if (showWatchlist) {
      path = "/watchlist";
    } else if (showAlerts) {
      path = "/alerts";
    }
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }
  }, [selectedStock, showWatchlist, showAlerts]);

  const handleStockSelect = (stock) => {
    setSelectedStock(stock);
    setShowWatchlist(false);
    setShowAlerts(false);
  };

  const handleBack = () => {
    setSelectedStock(null);
    setShowWatchlist(false);
    setShowAlerts(false);
  };

  const handleLogoClick = () => {
    setSelectedStock(null);
    setShowWatchlist(false);
    setShowAlerts(false);
  };

  const handleWatchlistClick = () => {
    setShowWatchlist(true);
    setSelectedStock(null);
    setShowAlerts(false);
  };

  const handleAlertsClick = () => {
    setShowAlerts(true);
    setSelectedStock(null);
    setShowWatchlist(false);
  };

  const isHome = !selectedStock && !showWatchlist && !showAlerts;
  const activeView = isHome
    ? "markets"
    : showWatchlist
      ? "watchlist"
      : showAlerts
        ? "alerts"
        : null;

  // Per-page title, description and canonical URL for search engines and tabs.
  useEffect(() => {
    let title = DEFAULT_TITLE;
    let description = DEFAULT_DESCRIPTION;
    let path = "/";
    let robots = "index, follow, max-image-preview:large";
    if (selectedStock) {
      const { symbol } = selectedStock;
      const name = selectedStock.description ? ` (${selectedStock.description})` : "";
      title = `${symbol} Stock Price, Chart & Alerts | Stock Tracker`;
      description = `Live ${symbol}${name} stock price, interactive candlestick chart with 5 years of history, and free price alerts.`;
      path = `/stock/${encodeURIComponent(symbol)}`;
    } else if (showWatchlist) {
      title = "My Watchlist | Stock Tracker";
      path = "/watchlist";
      robots = "noindex, follow"; // personal page with no shared content
    } else if (showAlerts) {
      title = "Price Alerts | Stock Tracker";
      path = "/alerts";
      robots = "noindex, follow";
    }
    document.title = title;
    const meta = (key, attr) => () => {
      const el = document.createElement("meta");
      el.setAttribute(attr, key);
      return el;
    };
    setHeadTag('meta[name="description"]', "content", description, meta("description", "name"));
    setHeadTag('meta[name="robots"]', "content", robots, meta("robots", "name"));
    setHeadTag('meta[property="og:title"]', "content", title, meta("og:title", "property"));
    setHeadTag('meta[property="og:description"]', "content", description, meta("og:description", "property"));
    setHeadTag('meta[property="og:url"]', "content", SITE_URL + path, meta("og:url", "property"));
    setHeadTag('link[rel="canonical"]', "href", SITE_URL + path, () => {
      const el = document.createElement("link");
      el.setAttribute("rel", "canonical");
      return el;
    });
  }, [selectedStock, showWatchlist, showAlerts]);

  const { loading } = usePricesContext();
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-black">
        <LoadingSpinner />
      </div>
    );
  }

  // Shared shell for the inner pages (watchlist, alerts, stock detail).
  const renderPage = (title, subtitle, children, withSearch = true) => (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-32 pb-24">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
          {title}
        </h1>
        <p className="mt-2 text-neutral-400">{subtitle}</p>
      </div>
      {withSearch && (
        <div className="mb-8 flex justify-start">
          <SearchBar onStockSelect={handleStockSelect} align="left" />
        </div>
      )}
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-neutral-100 antialiased">
      <Header
        activeView={activeView}
        onLogoClick={handleLogoClick}
        onWatchlistClick={handleWatchlistClick}
        onAlertsClick={handleAlertsClick}
      />

      <AlertNotification
        triggeredAlerts={triggeredAlerts}
        onDismiss={dismissTriggeredAlert}
      />

      <main>
        {isHome ? (
          <>
            {/* Hero */}
            <section className="px-4 pt-36 sm:pt-44 pb-12 text-center">
              <h1 className="mx-auto max-w-3xl text-4xl sm:text-6xl font-bold tracking-tight text-white">
                Markets, Made Simple
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-base sm:text-lg text-neutral-400">
                Track your favorite tickers, monitor price action, and dive into
                live charts — all in one place.
              </p>
              <div className="mt-8 flex justify-center">
                <SearchBar onStockSelect={handleStockSelect} />
              </div>
            </section>

            {/* Image band that fades into the page */}
            <div
              aria-hidden
              className="h-56 sm:h-80 w-full bg-cover bg-center [mask-image:linear-gradient(to_bottom,transparent,black_30%,black_55%,transparent)]"
              style={{ backgroundImage: `url(${bgImage})` }}
            />

            {/* Popular stocks */}
            <section className="relative px-4 sm:px-6 pt-4 pb-28">
              <div className="mx-auto max-w-5xl">
                <TopTen onStockSelect={handleStockSelect} />
              </div>
            </section>
          </>
        ) : showWatchlist ? (
          renderPage(
            "Watchlist",
            "Your saved stocks. Select one to view details.",
            <Watchlist onStockSelect={handleStockSelect} />
          )
        ) : showAlerts ? (
          renderPage(
            "Price Alerts",
            "Get notified when a stock crosses your target price.",
            <Alerts />,
            false
          )
        ) : (
          renderPage(
            selectedStock.symbol,
            selectedStock.description || "Quote, alerts and chart.",
            <StockDetail stock={selectedStock} onBack={handleBack} />
          )
        )}
      </main>

      {/* News Ticker at Bottom */}
      <NewsTicker />
    </div>
  );
}

export default App;
