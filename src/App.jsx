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
    const handlePopState = (event) => {
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

  // Update URL when stock selection or watchlist view changes
  useEffect(() => {
    if (selectedStock) {
      const symbol = encodeURIComponent(selectedStock.symbol);
      window.history.pushState(
        { stock: selectedStock },
        "",
        `/stock/${symbol}`
      );
    } else if (showWatchlist) {
      window.history.pushState({}, "", "/watchlist");
    } else if (showAlerts) {
      window.history.pushState({}, "", "/alerts");
    } else {
      window.history.pushState({}, "", "/");
    }
  }, [selectedStock, showWatchlist, showAlerts]);

  const handleStockSelect = (stock) => {
    setSelectedStock(stock);
    setShowWatchlist(false);
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
  const containerClasses = [
    "min-h-screen",
    "text-gray-900",
    "p-6",
    "relative",
    isHome ? "bg-cover bg-center bg-no-repeat" : "bg-gray-950",
  ].join(" ");
  const containerStyle = isHome ? { backgroundImage: `url(${bgImage})` } : {};

  const headingClasses = [
    "text-5xl font-extrabold cursor-pointer hover:text-blue-400 transition-colors tracking-tight",
    isHome ? "text-white" : "text-gray-900",
  ].join(" ");
  const { loading } = usePricesContext();
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }
  return (
    <div className={containerClasses} style={containerStyle}>
      {/* Fixed Header */}
      <Header
        onLogoClick={handleLogoClick}
        onWatchlistClick={handleWatchlistClick}
        onAlertsClick={handleAlertsClick}
        isHome={isHome}
      />

      <AlertNotification
        triggeredAlerts={triggeredAlerts}
        onDismiss={dismissTriggeredAlert}
      />
      {/* Dark overlay only for home page with background image */}
      {isHome && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      )}

      <div className="relative z-10 pt-20">
        {isHome ? (
          <>
            <section className="min-h-screen flex flex-col items-center justify-center text-center gap-6 px-4">
              <div>
                <h1 className={headingClasses}>Live Market Data</h1>
                <p className="text-white/90 text-lg mt-4 max-w-2xl leading-relaxed font-normal">
                  Track your favorite tickers, monitor price action, and dive
                  into live charts with ease.
                </p>
              </div>
              <SearchBar onStockSelect={handleStockSelect} />
            </section>
            <section className="backdrop-blur-md rounded-t-3xl shadow-2xl px-6 sm:px-10 py-10">
              <TopTen onStockSelect={handleStockSelect} />
            </section>
          </>
        ) : showWatchlist ? (
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-white/90 text-base font-normal leading-relaxed">
                  Your saved stocks. Click to view details.
                </p>
              </div>
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6">
                <SearchBar onStockSelect={handleStockSelect} />
                <div className="mt-6">
                  <Watchlist onStockSelect={handleStockSelect} />
                </div>
              </div>
            </div>
          </div>
        ) : showAlerts ? (
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-white/90 text-base font-normal leading-relaxed">
                  Manage your price alerts. Triggered alerts appear at the top
                  right and stay until dismissed.
                </p>
              </div>
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6">
                <Alerts />
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-white/90 text-base font-normal leading-relaxed">
                  Search for another symbol or return home.
                </p>
              </div>
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6">
                <SearchBar onStockSelect={handleStockSelect} />
                <div className="mt-6">
                  <StockDetail stock={selectedStock} onBack={handleBack} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* News Ticker at Bottom */}
      <NewsTicker />
    </div>
  );
}

export default App;
