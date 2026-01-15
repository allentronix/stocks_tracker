export default function AlertNotification({ triggeredAlerts, onDismiss }) {
  if (!triggeredAlerts || triggeredAlerts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex flex-col items-center gap-3 pt-4 px-4 pointer-events-none">
      {triggeredAlerts.map((alert) => (
        <div
          key={alert.id}
          className="bg-white rounded-lg shadow-2xl border-l-4 border-blue-500 p-4 animate-slide-in-right max-w-md w-full pointer-events-auto"
          style={{
            animation: "slideInRight 0.3s ease-out",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <svg
                  className="w-5 h-5 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <h3 className="font-semibold text-gray-900">{alert.symbol}</h3>
              </div>
              <p className="text-sm text-gray-700">
                {alert.symbol} is {alert.condition} ${alert.targetPrice.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Current price: ${alert.currentPrice.toFixed(2)}
              </p>
            </div>
            <button
              onClick={() => onDismiss(alert.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss alert"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      ))}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

