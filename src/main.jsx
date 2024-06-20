import React from 'react';
import ReactDOM from 'react-dom/client';


// Stylesheet
import "@fontsource/inter/index.css";
import './index.css';
import BetterRouter from './BetterRouter';
import { BrowserRouter } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <BetterRouter />
    </BrowserRouter>
  </React.StrictMode>
);
