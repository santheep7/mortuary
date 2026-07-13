import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { MortuaryNameProvider } from './context/MortuaryNameContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <MortuaryNameProvider>
        <App />
      </MortuaryNameProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
