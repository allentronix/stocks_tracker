import MarketStatus from "./MarketStatus";

/**
 * Fixed header component with navigation and market status
 * Styled similar to modern space/tech UI with glass morphism
 */
export default function Header({
  onLogoClick,
  onWatchlistClick,
  onAlertsClick,
  isHome
}) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/40 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div
            onClick={onLogoClick}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
            <h1 className="text-xl font-bold text-white tracking-tight">
              Stock Tracker
            </h1>
          </div>

          {/* Navigation and Status */}
          <div className="flex items-center gap-4">
            {/* Market Status */}
            <MarketStatus />

            {/* Navigation Buttons */}
            <nav className="flex items-center gap-2">
              <button
                type="button"
                onClick={onWatchlistClick}
                className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium transition-all duration-300 flex items-center gap-2 hover:border-white/20"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span className="hidden sm:inline">Watchlist</span>
              </button>

              <button
                type="button"
                onClick={onAlertsClick}
                className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium transition-all duration-300 flex items-center gap-2 hover:border-white/20"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Z" />
                  <path d="M20 16v-5a8 8 0 1 0-16 0v5" />
                  <path d="M4 16h16" />
                </svg>
                <span className="hidden sm:inline">Alerts</span>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
