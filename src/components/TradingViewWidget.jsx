import React, { useEffect, useRef, memo } from "react";

function TradingViewWidget({ symbol }) {
  const container = useRef();

  useEffect(() => {
    // Clear previous widget
    if (container.current) {
      container.current.innerHTML = "";
    }

    // Don't proceed if container doesn't exist
    if (!container.current) {
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;

    // Add error handling for script loading
    script.onerror = () => {
      console.warn("TradingView widget failed to load");
    };

    // Format symbol for TradingView (default to NASDAQ if no exchange specified)
    const formattedSymbol = symbol.includes(":") ? symbol : `NASDAQ:${symbol}`;

    script.innerHTML = JSON.stringify({
      allow_symbol_change: false,
      calendar: false,
      details: false,
      hide_side_toolbar: true,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      hotlist: false,
      interval: "D",
      locale: "en",
      save_image: true,
      style: "1",
      symbol: formattedSymbol,
      theme: "dark",
      timezone: "Etc/UTC",
      backgroundColor: "#0F0F0F",
      gridColor: "rgba(242, 242, 242, 0.06)",
      watchlist: [],
      withdateranges: false,
      compareSymbols: [],
      studies: [],
      autosize: true,
    });

    if (container.current) {
      container.current.appendChild(script);
    }

    // Cleanup function
    return () => {
      if (container.current) {
        // Clear the container more thoroughly
        container.current.innerHTML = "";
      }
    };
  }, [symbol]);

  return (
    <div
      className="tradingview-widget-container"
      ref={container}
      style={{ height: "100%", width: "100%" }}
    >
      <div
        className="tradingview-widget-container__widget"
        style={{ height: "calc(100% - 32px)", width: "100%" }}
      ></div>
      <div className="tradingview-widget-copyright">
        <a
          href={`https://www.tradingview.com/symbols/${symbol.replace(
            ":",
            "-"
          )}/`}
          rel="noopener nofollow"
          target="_blank"
        >
          <span className="blue-text">{symbol} stock chart</span>
        </a>
        <span className="trademark"> by TradingView</span>
      </div>
    </div>
  );
}

export default memo(TradingViewWidget);
