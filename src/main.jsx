import React from 'react';
import ReactDOM from 'react-dom/client';

// Stylesheet
import "@fontsource/inter/index.css";
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
