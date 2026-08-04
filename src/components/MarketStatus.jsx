/**
 * MarketStatus component displays the current US market status
 * Shows green badge when market is open, red when closed with reason
 */
export default function MarketStatus({ isOpen, reason, loading }) {
  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-400 text-sm font-medium transition-all">
        <span className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></span>
        <span>Checking market status...</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
        isOpen
          ? "bg-emerald-900/20 text-emerald-400 border-emerald-500/50"
          : "bg-red-900/20 text-red-400 border-red-500/50"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          isOpen ? "bg-emerald-400" : "bg-red-400"
        }`}
      ></span>
      <span>
        {isOpen ? "🟢 Market is OPEN" : `🔴 Market is CLOSED`}
        {!isOpen && reason && (
          <span className="ml-1 opacity-75">
            (
            {reason === "weekend"
              ? "Weekend"
              : reason === "outside_hours"
                ? "Outside Hours"
                : reason === "holiday"
                  ? "Holiday"
                  : ""}
            )
          </span>
        )}
      </span>
    </div>
  );
}
