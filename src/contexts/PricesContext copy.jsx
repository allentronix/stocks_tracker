import { createContext, useContext, useEffect, useState } from "react";
import { fetchQuote } from "../api/finnhub";
const PricesContext = createContext(null);

const stockDeets = {
  symbol: "",
  currentPrice: 0,
  previousClose: 0,
  change: 0,
  changePercent: 0,
};
function usePrices() {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [symbolsSubscribed, setSymbolsSubscribed] = useState([]);
  const [socket, setSocket] = useState(null);

  const [stocks, setStocks] = useState([]);

  let createdSocket = false;
  useEffect(() => {
    if (createdSocket) return;
    createdSocket = true;
    setLoading(true);
    const socket = new WebSocket(
      `wss://ws.finnhub.io?token=${import.meta.env.VITE_FINNHUB_API_KEY}`
    );

    setSocket(socket);
    socket.onopen = () => {
      if (socket.readyState === WebSocket.OPEN) {
        setLoading(false);
        console.log("WebSocket connected");
      }
    };
    socket.addEventListener("open", function (event) {
      //   setLoading(false);
    });

    socket.addEventListener("error", function (event) {
      setError(error);
      //   setLoading(false);
    });
    socket.addEventListener("message", function (event) {
      const data = JSON.parse(event.data);
      //   if (
      //     ["connected", "ping"].includes(data.type) &&
      //     socket.readyState === WebSocket.OPEN
      //   ) {
      //     setLoading(false);
      //   }
      console.log("Message from server ", event.data);
      if (data.type === "trade") {
        const lastTrade = data.data[data.data.length - 1];
        const { s: symbol, p: price, t: timestamp, v: volume } = lastTrade;
        // setStocks((prevStocks) =>
        //   prevStocks.map((stock) =>
        //     stock.symbol === symbol
        //       ? {
        //           ...stock,
        //           currentPrice: price,
        //           timestamp: timestamp,
        //           volume: volume,
        //         }
        //       : stock
        //   )
        // );

      // TEMPORARY: Add .1 to the currentPrice of the first item in stocks
      setStocks((prevStocks) => {
        if (prevStocks.length === 0) return prevStocks;
        const updatedStocks = [...prevStocks];
        updatedStocks[0] = {
          ...updatedStocks[0],
          currentPrice: updatedStocks[0].currentPrice + 0.1,
        };
        return updatedStocks;
      });
      }
    });
  }, []);

  async function fetchStockDetails(symbol) {
    try {
      const data = await fetchQuote(symbol);
      const formattedData = {
        symbol: symbol,
        currentPrice: data.c,
        previousClose: data.pc,
        change: data.c - data.pc,
        changePercent: ((data.c - data.pc) / data.pc) * 100,
      };
      return formattedData;
    } catch (error) {
      console.error("Error fetching stock details: ", error);
      return null;
    }
  }

  const symbolsBeingFetched = [];

  async function subscribeToSymbol(symbol) {
    if (symbolsBeingFetched.includes(symbol)) return;
    symbolsBeingFetched.push(symbol);

    if (symbolsSubscribed.includes(symbol)) return;

    const isStockAlreadyInStocks = stocks.some(
      (stock) => stock.symbol === symbol
    );
    if (!isStockAlreadyInStocks) {
      const stockDetails = await fetchStockDetails(symbol);
      if (stockDetails) {
        setStocks((prevStocks) => [...prevStocks, stockDetails]);
        console.log("Stock details: ", symbol, stockDetails, stocks);
      }
    }

    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log("sockk", socket);
      setSymbolsSubscribed([...symbolsSubscribed, symbol]);
      socket.send(JSON.stringify({ type: "subscribe", symbol: symbol }));
    }
    symbolsBeingFetched.splice(symbolsBeingFetched.indexOf(symbol), 1);
    console.warn("Subscribed to symbol: ", symbol, "Stocks: ", stocks);
  }

  function unsubscribeFromSymbol(symbol) {
    if (!symbolsSubscribed.includes(symbol)) return;
    setSymbolsSubscribed(symbolsSubscribed.filter((s) => s !== symbol));
    if (socket) {
      socket.send(JSON.stringify({ type: "unsubscribe", symbol: symbol }));
    }
    symbolsBeingFetched.splice(symbolsBeingFetched.indexOf(symbol), 1);
  }

  function unsubscribeAll() {
    setSymbolsSubscribed([]);
    socket.send(
      JSON.stringify({
        type: "unsubscribe",
        symbol: symbolsSubscribed.join(","),
      })
    );
  }

  useEffect(() => {
    // subscribeToSymbol("AAPL");
    // return
  }, []);
  return {
    prices,
    setPrices,
    loading,
    stocks,
    subscribeToSymbol,
    unsubscribeFromSymbol,
    unsubscribeAll,
  };
}
export function PricesProvider({ children }) {
  const prices = usePrices();

  return (
    <PricesContext.Provider value={prices}>{children}</PricesContext.Provider>
  );
}

export function usePricesContext() {
  const context = useContext(PricesContext);
  if (!context) {
    throw new Error("usePricesContext must be used within a PricesProvider");
  }
  return context;
}

// type
// Message type.

// data
// List of trades or price updates.

// s
// Symbol.

// p
// Last price.

// t
// UNIX milliseconds timestamp.

// v
// Volume.

// c
// List of trade conditions. A comprehensive list of trade conditions code can be found here

// {
//   "data": [
//     {
//       "p": 7296.89,
//       "s": "BINANCE:BTCUSDT",
//       "t": 1575526691134,
//       "v": 0.011467
//     }
//   ],
//   "type": "trade"
// }
