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
        const match = path.match(/\/stock\/(.+)/);
        if (match) {
          const symbol = decodeURIComponent(match[1]);
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
      const match = path.match(/\/stock\/(.+)/);
      if (match) {
        const symbol = decodeURIComponent(match[1]);
        setSelectedStock({ symbol });
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

            {/* Top 10 */}
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
