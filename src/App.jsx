import TopTen from "./components/TopTen";
import SearchBar from "./components/SearchBar";
import StockDetail from "./components/StockDetail";
import { useState, useEffect } from "react";

function App() {
  const [selectedStock, setSelectedStock] = useState(null);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event) => {
      // When browser back/forward is used, check the URL
      const path = window.location.pathname;
      if (path === '/' || path === '') {
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

    window.addEventListener('popstate', handlePopState);
    
    // Check initial URL on mount
    const path = window.location.pathname;
    const match = path.match(/\/stock\/(.+)/);
    if (match) {
      const symbol = decodeURIComponent(match[1]);
      setSelectedStock({ symbol });
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Update URL when stock selection changes
  useEffect(() => {
    if (selectedStock) {
      const symbol = encodeURIComponent(selectedStock.symbol);
      window.history.pushState({ stock: selectedStock }, '', `/stock/${symbol}`);
    } else {
      window.history.pushState({}, '', '/');
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

  return (
    <div className="min-h-screen bg-red-100 text-gray-900 p-6">
      <h1 
        className="text-3xl font-bold mb-4 cursor-pointer hover:text-blue-600 transition-colors"
        onClick={handleLogoClick}
      >
        Stock Tracker
      </h1>
      <SearchBar onStockSelect={handleStockSelect} />
      {selectedStock ? (
        <StockDetail
          stock={selectedStock}
          onBack={handleBack}
        />
      ) : (
        <TopTen onStockSelect={handleStockSelect} />
      )}
    </div>
  );
}

export default App;
