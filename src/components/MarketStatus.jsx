/**
 * MarketStatus component displays the current US market status
 * as a compact pill: green when open, red when closed (with reason on hover).
 */
const REASON_LABELS = {
  weekend: "Weekend",
  outside_hours: "Outside trading hours",
  holiday: "Holiday",
};

export default function MarketStatus({ isOpen, reason, loading, offline }) {
  let label = isOpen ? "Market Open" : "Market Closed";
  let dot = isOpen ? "bg-emerald-400" : "bg-red-400";
  let title = isOpen
    ? "US market is open"
    : `US market is closed${REASON_LABELS[reason] ? ` (${REASON_LABELS[reason]})` : ""}`;

  if (loading) {
    label = "Checking…";
    dot = "bg-neutral-500 animate-pulse";
    title = "Checking market status";
  } else if (offline) {
    label = "Offline";
    dot = "bg-amber-400";
    title = "Price service unreachable — retrying";
  }

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-neutral-300"
      title={title}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      <span className="hidden sm:inline">{label}</span>
      <span className="sr-only sm:hidden">{label}</span>
    </div>
  );
}
