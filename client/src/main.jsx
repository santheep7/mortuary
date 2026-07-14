import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { MortuaryNameProvider } from './context/MortuaryNameContext.jsx'

// If the server ever rejects the token (expired/invalid), send the user
// back to the right login screen instead of leaving them stuck looking at
// a broken dashboard.
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const role = localStorage.getItem('role');
      localStorage.removeItem('role');
      localStorage.removeItem('admin');
      localStorage.removeItem('username');

      const loginPath = role === 'SuperAdmin' ? '/superadmin-login'
        : role === 'Admin' ? '/admin-login'
        : '/';
      if (window.location.pathname !== loginPath) {
        window.location.href = loginPath;
      }
    }
    return Promise.reject(error);
  }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <MortuaryNameProvider>
        <App />
      </MortuaryNameProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
