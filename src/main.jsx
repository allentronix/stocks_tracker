import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { PriceAlertsProvider } from './contexts/PriceAlertsContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PriceAlertsProvider>
      <App />
    </PriceAlertsProvider>
  </StrictMode>,
)
