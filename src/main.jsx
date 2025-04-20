import React from 'react';
import ReactDOM from 'react-dom/client';

// Stylesheet
import "@fontsource/inter/index.css";
import './index.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
    <App />
    </AuthProvider>
  </React.StrictMode>
);
