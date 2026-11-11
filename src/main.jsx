import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import FitReadout, { showFitReadout } from './components/FitReadout.jsx'
import { watchScreenHeight } from './viewport.js'

watchScreenHeight()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    {showFitReadout && <FitReadout />}
  </StrictMode>,
)
