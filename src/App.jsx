import TopTen from "./components/TopTen";
import SearchBar from "./components/SearchBar";
import StockDetail from "./components/StockDetail";
import { useState, useEffect } from "react";
import bgImage from "./assets/bg-image.jpg";

function App() {
  const [selectedStock, setSelectedStock] = useState(null);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event) => {
      // When browser back/forward is used, check the URL
      const path = window.location.pathname;
      if (path === "/" || path === "") {
        setSelectedStock(null);
      } else {
        // If there's a stock in the URL, parse it
        const match = path.match(/\/stock\/(.+)/);
        if (match) {
          const symbol = decodeURIComponent(match[1]);
          setSelectedStock({ symbol });
        }
      }
    };

    window.addEventListener("popstate", handlePopState);

    // Check initial URL on mount
    const path = window.location.pathname;
    const match = path.match(/\/stock\/(.+)/);
    if (match) {
      const symbol = decodeURIComponent(match[1]);
      setSelectedStock({ symbol });
    }

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Update URL when stock selection changes
  useEffect(() => {
    if (selectedStock) {
      const symbol = encodeURIComponent(selectedStock.symbol);
      window.history.pushState(
        { stock: selectedStock },
        "",
        `/stock/${symbol}`
      );
    } else {
      window.history.pushState({}, "", "/");
    }
  }, [selectedStock]);

  const handleStockSelect = (stock) => {
    setSelectedStock(stock);
  };

  const handleBack = () => {
    setSelectedStock(null);
  };

  const handleLogoClick = () => {
    setSelectedStock(null);
  };

  const isHome = !selectedStock;
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
            </section>
            <section className="bg-white/90 backdrop-blur-md rounded-t-3xl shadow-2xl px-6 sm:px-10 py-10">
              <TopTen onStockSelect={handleStockSelect} />
            </section>
          </>
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
