import MarketStatus from "./MarketStatus";
import { useMarketStatus } from "../hooks/useMarketStatus";

/**
 * Fixed header: logo, text navigation, market status and a primary action.
 */
export default function Header({
  activeView,
  onLogoClick,
  onWatchlistClick,
  onAlertsClick,
}) {
  const { isOpen, reason, loading, gatewayLive } = useMarketStatus();

  const links = [
    { id: "markets", label: "Markets", onClick: onLogoClick },
    { id: "watchlist", label: "Watchlist", onClick: onWatchlistClick },
    { id: "alerts", label: "Alerts", onClick: onAlertsClick },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/70 backdrop-blur-xl border-b border-white/5">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 sm:gap-10 min-w-0">
          <button
            type="button"
            onClick={onLogoClick}
            className="text-lg font-bold tracking-tight text-white hover:opacity-80 transition-opacity whitespace-nowrap"
          >
            Stock Tracker
          </button>

          <nav className="flex items-center gap-4 sm:gap-7">
            {links.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={link.onClick}
                aria-current={activeView === link.id ? "page" : undefined}
                className={`text-sm transition-colors ${
                  activeView === link.id
                    ? "text-white"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="hidden sm:flex items-center gap-3">
          <MarketStatus
            isOpen={isOpen}
            reason={reason}
            loading={loading}
            offline={!loading && !gatewayLive}
          />
          <button
            type="button"
            onClick={onAlertsClick}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-neutral-200 transition-colors"
          >
            Set an Alert
            <span aria-hidden>→</span>
          </button>
        </div>
      </div>
    </header>
  );
}
