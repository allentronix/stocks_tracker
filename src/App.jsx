import TopTen from "./components/TopTen";
import SearchBar from "./components/SearchBar";
import StockDetail from "./components/StockDetail";
import Watchlist from "./components/Watchlist";
import { useState, useEffect } from "react";
import bgImage from "./assets/bg-image.jpg";

function App() {
  const [selectedStock, setSelectedStock] = useState(null);
  const [showWatchlist, setShowWatchlist] = useState(false);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event) => {
      // When browser back/forward is used, check the URL
      const path = window.location.pathname;
      if (path === "/" || path === "") {
        setSelectedStock(null);
        setShowWatchlist(false);
      } else if (path === "/watchlist") {
        setSelectedStock(null);
        setShowWatchlist(true);
      } else {
        // If there's a stock in the URL, parse it
        const match = path.match(/\/stock\/(.+)/);
        if (match) {
          const symbol = decodeURIComponent(match[1]);
          setSelectedStock({ symbol });
          setShowWatchlist(false);
        }
      }
    };

    window.addEventListener("popstate", handlePopState);

    // Check initial URL on mount
    const path = window.location.pathname;
    if (path === "/watchlist") {
      setShowWatchlist(true);
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
    } else {
      window.history.pushState({}, "", "/");
    }
  }, [selectedStock, showWatchlist]);

  const handleStockSelect = (stock) => {
    setSelectedStock(stock);
    setShowWatchlist(false);
  };

  const handleBack = () => {
    setSelectedStock(null);
    setShowWatchlist(false);
  };

  const handleLogoClick = () => {
    setSelectedStock(null);
    setShowWatchlist(false);
  };

  const handleWatchlistClick = () => {
    setShowWatchlist(true);
    setSelectedStock(null);
  };

  const isHome = !selectedStock && !showWatchlist;
  const containerClasses = [
    "min-h-screen",
    "text-gray-900",
    "p-6",
    "relative",
    isHome ? "bg-cover bg-center bg-no-repeat" : "bg-white",
  ].join(" ");
  const containerStyle = isHome ? { backgroundImage: `url(${bgImage})` } : {};

  const headingClasses = [
    "text-4xl font-bold cursor-pointer hover:text-blue-400 transition-colors",
    isHome ? "text-white" : "text-gray-900",
  ].join(" ");

  return (
    <div className={containerClasses} style={containerStyle}>
      {isHome && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      )}
      <div className="relative z-10">
        {isHome ? (
          <>
            <section className="min-h-screen flex flex-col items-center justify-center text-center gap-6 px-4">
              <div onClick={handleLogoClick}>
                <h1 className={headingClasses}>Stock Tracker</h1>
                <p className="text-white/80 mt-4 max-w-2xl">
                  Track your favorite tickers, monitor price action, and dive
                  into live charts with ease.
                </p>
              </div>
              <SearchBar onStockSelect={handleStockSelect} />
              <button
                type="button"
                onClick={handleWatchlistClick}
                className="mt-4 px-6 py-3 bg-white/90 hover:bg-white text-gray-900 font-semibold rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl flex items-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Watchlist
              </button>
            </section>
            <section className=" backdrop-blur-md rounded-t-3xl shadow-2xl px-6 sm:px-10 py-10">
              <TopTen onStockSelect={handleStockSelect} />
            </section>
          </>
        ) : showWatchlist ? (
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col gap-6">
              <div>
                <h1 className={headingClasses} onClick={handleLogoClick}>
                  Stock Tracker
                </h1>
                <p className="text-gray-600">
                  Your saved stocks. Click to view details.
                </p>
              </div>
              <div className="bg-white rounded-2xl shadow-2xl p-6">
                <SearchBar onStockSelect={handleStockSelect} />
                <button
                  type="button"
                  onClick={handleWatchlistClick}
                  className="mt-4 px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl flex items-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  Watchlist
                </button>
                <div className="mt-6">
                  <Watchlist onStockSelect={handleStockSelect} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col gap-6">
              <div>
                <h1 className={headingClasses} onClick={handleLogoClick}>
                  Stock Tracker
                </h1>
                <p className="text-gray-600">
                  Search for another symbol or return home.
                </p>
              </div>
              <div className="bg-white rounded-2xl shadow-2xl p-6">
                <SearchBar onStockSelect={handleStockSelect} />
                <button
                  type="button"
                  onClick={handleWatchlistClick}
                  className="mt-4 px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl flex items-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  Watchlist
                </button>
                <div className="mt-6">
                  <StockDetail stock={selectedStock} onBack={handleBack} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
