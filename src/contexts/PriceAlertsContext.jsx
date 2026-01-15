import { createContext, useContext } from "react";
import { usePriceAlerts } from "../hooks/usePriceAlerts";

const PriceAlertsContext = createContext(null);

export function PriceAlertsProvider({ children }) {
  const priceAlerts = usePriceAlerts();

  return (
    <PriceAlertsContext.Provider value={priceAlerts}>
      {children}
    </PriceAlertsContext.Provider>
  );
}

export function usePriceAlertsContext() {
  const context = useContext(PriceAlertsContext);
  if (!context) {
    throw new Error(
      "usePriceAlertsContext must be used within a PriceAlertsProvider"
    );
  }
  return context;
}

