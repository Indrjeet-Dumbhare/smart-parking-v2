import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { SlotsProvider } from './context/SlotsContext.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SlotsProvider>
          <App />
        </SlotsProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
