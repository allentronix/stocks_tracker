import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { PriceAlertsProvider } from "./contexts/PriceAlertsContext.jsx";
import { PricesProvider } from "./contexts/PricesContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PricesProvider>
      <PriceAlertsProvider>
        <App />
      </PriceAlertsProvider>
    </PricesProvider>
  </StrictMode>
);
