import { usePricesContext } from "../contexts/PricesContext";

/**
 * Custom hook to check US market status
 * Reads the status from the shared API-gateway snapshot (time-based check,
 * confirmed with Polygon during trading hours to catch holidays).
 * @returns {Object} Market status object with isOpen, reason, status, loading, and error
 */
export function useMarketStatus() {
  const { marketStatus, marketStatusLoading, error, gatewayLive } =
    usePricesContext();

  return {
    isOpen: Boolean(marketStatus.isOpen),
    reason: marketStatus.reason,
    status: marketStatus.message,
    currentTime: marketStatus.currentTime
      ? new Date(marketStatus.currentTime)
      : null,
    loading: marketStatusLoading,
    error,
    gatewayLive,
  };
}
